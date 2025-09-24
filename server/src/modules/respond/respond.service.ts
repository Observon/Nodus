import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function quantizeNowToHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

@Injectable()
export class RespondService {
  constructor(private readonly prisma: PrismaService) {}

  async getSurveyForRespondent(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.status === 'CLOSED') throw new BadRequestException('Survey closed');
    return survey;
  }

  async submit(dto: {
    surveyId: string;
    tokenHash: string; // hex
    answers: { questionId: string; valueJson: string }[];
  }) {
    const { surveyId, tokenHash } = dto;
    if (!/^[0-9a-f]{64}$/i.test(tokenHash)) {
      throw new BadRequestException('tokenHash inválido');
    }

    const token = await this.prisma.token.findFirst({
      where: { tokenHash: tokenHash.toLowerCase(), revoked: false },
      include: { batch: true },
    });
    if (!token) throw new NotFoundException('Token não encontrado');

    if (token.consumedAt) throw new BadRequestException('Token já utilizado');

    // validar survey do token
    if (token.batch.surveyId !== surveyId) {
      throw new BadRequestException('Token não pertence a este questionário');
    }

    // validar perguntas
    const questions = await this.prisma.question.findMany({ where: { surveyId }, orderBy: { order: 'asc' } });
    const qmap = new Map(questions.map((q) => [q.id, q]));

    for (const q of questions) {
      const ans = dto.answers.find((a) => a.questionId === q.id);
      if (q.required && !ans) {
        throw new BadRequestException(`Pergunta obrigatória sem resposta: ${q.id}`);
      }
    }

    const submittedAtBucket = quantizeNowToHour();

    const created = await this.prisma.$transaction(async (tx) => {
      const response = await tx.response.create({
        data: {
          surveyId,
          tokenHash: tokenHash.toLowerCase(),
          submittedAtBucket,
        },
      });

      if (dto.answers?.length) {
        await tx.answer.createMany({
          data: dto.answers.map((a) => ({
            responseId: response.id,
            questionId: a.questionId,
            valueJson: JSON.parse(a.valueJson),
          })),
        });
      }

      await tx.token.update({ where: { id: token.id }, data: { consumedAt: new Date() } });

      await tx.auditLog.create({
        data: {
          type: 'RESPONSE_SUBMITTED',
          payloadJson: { surveyId, tokenHash: tokenHash.toLowerCase(), submittedAtBucket },
        },
      });

      return response;
    });

    return { ok: true, responseId: created.id };
  }
}
