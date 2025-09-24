import * as crypto from 'crypto';

export function sha256(input: Buffer | string): Buffer {
  return crypto.createHash('sha256').update(input).digest();
}

export class MerkleTree {
  public leaves: Buffer[];
  public layers: Buffer[][];

  constructor(leaves: (Buffer | string)[]) {
    this.leaves = leaves.map((l) => (Buffer.isBuffer(l) ? l : Buffer.from(l)));
    if (this.leaves.length === 0) {
      this.layers = [[Buffer.alloc(32)]];
    } else {
      this.layers = [this.leaves.map((l) => sha256(l))];
      this.buildLayers();
    }
  }

  private buildLayers() {
    let current = this.layers[0];
    while (current.length > 1) {
      const next: Buffer[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : left;
        next.push(sha256(Buffer.concat([left, right])));
      }
      this.layers.push(next);
      current = next;
    }
  }

  get root(): string {
    const top = this.layers[this.layers.length - 1][0];
    return top.toString('hex');
  }

  getProof(leafHashInput: Buffer | string): MerkleProofItem[] {
    const leafHash = Buffer.isBuffer(leafHashInput)
      ? leafHashInput
      : Buffer.from(typeof leafHashInput === 'string' ? leafHashInput : String(leafHashInput));
    const proof: MerkleProofItem[] = [];
    let index = this.layers[0].findIndex((h) => h.equals(leafHash));
    if (index === -1) return proof;

    for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
      const layer = this.layers[layerIndex];
      const isRightNode = index % 2 === 1;
      const pairIndex = isRightNode ? index - 1 : index + 1;
      const pair = layer[pairIndex] || layer[index];
      proof.push({ sibling: pair.toString('hex'), isLeftSibling: isRightNode });
      index = Math.floor(index / 2);
    }
    return proof;
  }

  static verifyDirectedProof(leafHashHex: string, proof: MerkleProofItem[], rootHex: string): boolean {
    let computed = Buffer.from(leafHashHex, 'hex');
    for (const { sibling, isLeftSibling } of proof) {
      const sib = Buffer.from(sibling, 'hex');
      const concat = isLeftSibling ? Buffer.concat([sib, computed]) : Buffer.concat([computed, sib]);
      computed = sha256(concat);
    }
    return computed.toString('hex') === rootHex;
  }
}

export type MerkleProofItem = { sibling: string; isLeftSibling: boolean };
