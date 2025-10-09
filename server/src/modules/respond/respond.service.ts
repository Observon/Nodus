import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitResponseDto } from './dto/submit-response.dto';

function quantizeToHour(date: Date): Date {
  const copy = new Date(date);
  copy.setMinutes(0, 0, 0);
  return copy;
}

@Injectable()
export class RespondService {
  constructor(private readonly prisma: PrismaService) {}

  async getSurveyForRespondent(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.status === 'CLOSED') throw new BadRequestException('Survey closed');

    return survey;
  }

  async submit(dto: SubmitResponseDto) {
    const { surveyId, tokenHash } = dto;

    if (!/^[0-9a-f]{64}$/i.test(tokenHash)) {
      throw new BadRequestException('tokenHash inválido');
    }

    const token = await this.prisma.token.findFirst({
      where: {
        tokenHash: tokenHash.toLowerCase(),
        revoked: false,
      },
      include: {
        batch: true,
      },
    });

    if (!token) throw new NotFoundException('Token não encontrado');
    if (token.consumedAt) throw new BadRequestException('Token já utilizado');
    if (token.batch.surveyId !== surveyId) {
      throw new BadRequestException('Token não pertence a este questionário');
    }

    const questions = await this.prisma.question.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' },
    });

    const questionsMap = new Map(
      questions.map((q: (typeof questions)[number]) => [q.id, q] as const),
    );

    for (const question of questions) {
      const answer = dto.answers.find((a) => a.questionId === question.id);
      if (question.required && !answer) {
        throw new BadRequestException(`Pergunta obrigatória sem resposta: ${question.id}`);
      }
    }

    const now = new Date();
    const submittedAtBucket = quantizeToHour(now);

    const response = await this.prisma.$transaction(async (tx) => {
      const created = await tx.response.create({
        data: {
          surveyId,
          tokenHash: tokenHash.toLowerCase(),
          submittedAtBucket,
        },
      });

      if (dto.answers?.length) {
        const answerData = dto.answers.map((a) => {
          if (!questionsMap.has(a.questionId)) {
            throw new BadRequestException(`Pergunta inválida: ${a.questionId}`);
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(a.valueJson);
          } catch {
            throw new BadRequestException(`valueJson inválido para a pergunta ${a.questionId}`);
          }

          return {
            responseId: created.id,
            questionId: a.questionId,
            valueJson: parsed as Prisma.InputJsonValue,
          };
        });

        await tx.answer.createMany({ data: answerData });
      }

      await tx.token.update({
        where: { id: token.id },
        data: { consumedAt: now },
      });

      await tx.auditLog.create({
        data: {
          type: 'RESPONSE_SUBMITTED',
          payloadJson: {
            surveyId,
            tokenHash: tokenHash.toLowerCase(),
            submittedAtBucket,
          },
        },
      });

      return created;
    });

    return { ok: true, responseId: response.id };
  }
}
