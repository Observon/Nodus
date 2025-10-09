import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { MerkleTree, sha256, MerkleProofItem } from '../../utils/merkle';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createSurvey(dto: CreateSurveyDto) {
    return this.prisma.survey.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
      },
    });
  }

  async listSurveys() {
    return this.prisma.survey.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async addQuestion(surveyId: string, dto: AddQuestionDto) {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new NotFoundException('Survey not found');

    const lastOrder = await this.prisma.question.aggregate({
      where: { surveyId },
      _max: { order: true },
    });
    const nextOrder = dto.order ?? (lastOrder._max.order ?? 0) + 1;

    const optionsPayload = dto.options
      ? (JSON.parse(JSON.stringify(dto.options)) as Prisma.InputJsonValue)
      : undefined;

    return this.prisma.question.create({
      data: {
        surveyId,
        type: dto.type,
        prompt: dto.prompt,
        required: dto.required ?? true,
        order: nextOrder,
        optionsJson: optionsPayload,
      },
    });
  }

  async listBatches(surveyId: string) {
    return this.prisma.batch.findMany({
      where: { surveyId },
      include: {
        tokens: {
          select: { id: true, tokenHash: true, position: true, consumedAt: true, revoked: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBatch(surveyId: string, size: number) {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new NotFoundException('Survey not found');

    if (size <= 0 || size > 10000) {
      throw new Error('Tamanho de lote inválido (1..10000)');
    }

    const preimages: string[] = [];
    const leafHashes: Buffer[] = [];

    for (let i = 0; i < size; i++) {
      const preimage = crypto.randomBytes(32).toString('base64url');
      preimages.push(preimage);
      const hash = sha256(preimage);
      leafHashes.push(hash);
    }

    const tree = new MerkleTree(leafHashes);
    const merkleRoot = tree.root;

    const batch = await this.prisma.$transaction(async (tx) => {
      const createdBatch = await tx.batch.create({
        data: {
          surveyId,
          size,
          merkleRoot,
        },
      });

      const tokenCreates = leafHashes.map((hash, idx) => {
        const proof: MerkleProofItem[] = tree.getProof(hash);
        return {
          batchId: createdBatch.id,
          tokenHash: hash.toString('hex'),
          position: idx,
          proofJson: proof as unknown as object,
        };
      });

      await tx.token.createMany({ data: tokenCreates });

      await tx.auditLog.create({
        data: {
          type: 'MERKLE_ROOT_CREATED',
          payloadJson: { batchId: createdBatch.id, surveyId, merkleRoot, size },
        },
      });

      return createdBatch;
    });

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const links = preimages.map((preimage) => `${baseUrl}/respond/${surveyId}?t=${encodeURIComponent(preimage)}`);

    return {
      batch,
      merkleRoot,
      size,
      links,
      preimages,
    };
  }
}
