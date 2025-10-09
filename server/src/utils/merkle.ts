import * as crypto from 'crypto';

type HashBuffer = Buffer<ArrayBufferLike>;

export type MerkleProofItem = {
  sibling: string;
  isLeftSibling: boolean;
};

export function sha256(input: Buffer | string): HashBuffer {
  const data = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const digest = crypto.createHash('sha256').update(data).digest();
  return Buffer.from(digest) as HashBuffer;
}

export class MerkleTree {
  readonly leaves: HashBuffer[];
  readonly layers: HashBuffer[][];

  constructor(leaves: (Buffer | string)[]) {
    this.leaves = leaves.map((leaf) =>
      Buffer.isBuffer(leaf) ? (Buffer.from(leaf) as HashBuffer) : (Buffer.from(leaf) as HashBuffer),
    );

    if (this.leaves.length === 0) {
      this.layers = [[Buffer.alloc(32) as HashBuffer]];
    } else {
      this.layers = [this.leaves.map((leaf) => sha256(leaf))];
      this.buildLayers();
    }
  }

  private buildLayers() {
    let current = this.layers[0];

    while (current.length > 1) {
      const next: HashBuffer[] = [];

      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : current[i];
        next.push(sha256(Buffer.concat([left, right])));
      }

      this.layers.push(next);
      current = next;
    }
  }

  get root(): string {
    return this.layers[this.layers.length - 1][0].toString('hex');
  }

  getProof(leaf: Buffer | string): MerkleProofItem[] {
    const hashedLeaf = sha256(leaf);
    const proof: MerkleProofItem[] = [];

    let index = this.layers[0].findIndex((node) => node.equals(hashedLeaf));
    if (index === -1) {
      return proof;
    }

    for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
      const layer = this.layers[layerIndex];
      const isRightNode = index % 2 === 1;
      const pairIndex = isRightNode ? index - 1 : index + 1;
      const sibling = layer[pairIndex] ?? layer[index];

      proof.push({ sibling: sibling.toString('hex'), isLeftSibling: isRightNode });
      index = Math.floor(index / 2);
    }

    return proof;
  }

  static verifyDirectedProof(leafHashHex: string, proof: MerkleProofItem[], rootHex: string): boolean {
    let computed = Buffer.from(leafHashHex, 'hex') as HashBuffer;

    for (const { sibling, isLeftSibling } of proof) {
      const siblingBuffer = Buffer.from(sibling, 'hex') as HashBuffer;
      const data = isLeftSibling
        ? Buffer.concat([siblingBuffer, computed])
        : Buffer.concat([computed, siblingBuffer]);

      computed = sha256(data);
    }

    return computed.toString('hex') === rootHex;
  }
}
