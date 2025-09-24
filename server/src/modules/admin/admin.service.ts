import { Injectable, NotFoundException } from '@nestjs/common';
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
    const nextOrder = (lastOrder._max.order ?? 0) + 1;

    return this.prisma.question.create({
      data: {
        surveyId,
        type: dto.type,
        prompt: dto.prompt,
        required: dto.required ?? true,
        order: nextOrder,
        optionsJson: dto.options ?? undefined,
      },
    });
  }

  async listBatches(surveyId: string) {
    return this.prisma.batch.findMany({
      where: { surveyId },
      include: { tokens: { select: { id: true, tokenHash: true, position: true, consumedAt: true, revoked: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cria um lote de N tokens para um survey, calcula a Merkle root e grava no banco
   * Retorna as preimagens para exportação (CSV ou e-mail). O sistema NÃO guarda preimagens.
   */
  async createBatch(surveyId: string, size: number) {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new NotFoundException('Survey not found');

    if (size <= 0 || size > 10000) {
      throw new Error('Tamanho de lote inválido (1..10000)');
    }

    // 1) Gerar preimagens e hashes
    const preimages: string[] = [];
    const leafHashes: Buffer[] = [];

    for (let i = 0; i < size; i++) {
      const preimage = crypto.randomBytes(32).toString('base64url');
      preimages.push(preimage);
      const hash = sha256(preimage);
      leafHashes.push(hash);
    }

    // 2) Construir Merkle
    const tree = new MerkleTree(leafHashes);
    const merkleRoot = tree.root;

    // 3) Persistir Batch, Tokens (apenas hashes e posições)
    const created = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          surveyId,
          size,
          merkleRoot,
        },
      });

      const tokenCreates = leafHashes.map((hash, idx) => {
        const proof: MerkleProofItem[] = tree.getProof(hash);
        return {
          batchId: batch.id,
          tokenHash: hash.toString('hex'),
          position: idx,
          proofJson: proof as unknown as object,
        };
      });

      await tx.token.createMany({ data: tokenCreates });

      await tx.auditLog.create({
        data: {
          type: 'MERKLE_ROOT_CREATED',
          payloadJson: { batchId: batch.id, surveyId, merkleRoot, size },
        },
      });

      return batch;
    });

    // 4) Preparar links (APP_BASE_URL deve apontar para página de resposta pública no futuro)
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const links = preimages.map((preimage) => `${baseUrl}/respond/${surveyId}?t=${encodeURIComponent(preimage)}`);

    return {
      batch: created,
      merkleRoot,
      size,
      links,
      preimages, // para CSV; não armazenado no banco
    };
  }
}
