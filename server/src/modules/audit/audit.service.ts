import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MerkleTree } from '../../utils/merkle';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getBatch(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        tokens: {
          select: { id: true, tokenHash: true, position: true, consumedAt: true, revoked: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async verify(batchId: string, tokenHash: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Batch not found');

    const token = await this.prisma.token.findFirst({ where: { batchId, tokenHash: tokenHash.toLowerCase() } });
    if (!token) return { ok: false, reason: 'TOKEN_NOT_FOUND' } as const;

    // Reconstruir root a partir da prova armazenada
    const proof = token.proofJson as any[] | undefined;
    if (!proof || !Array.isArray(proof)) return { ok: false, reason: 'NO_PROOF_STORED' } as const;

    const ok = MerkleTree.verifyDirectedProof(tokenHash.toLowerCase(), proof as any, batch.merkleRoot);
    return { ok, expectedRoot: batch.merkleRoot };
  }
}
