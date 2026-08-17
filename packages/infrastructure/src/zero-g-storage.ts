import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Indexer, ZgFile } from "@0gfoundation/0g-storage-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import type { ArtifactReference, ArtifactStore } from "../../domain/src/index.js";

export type ZeroGStorageConfig = {
  chainId: number;
  rpcUrl: string;
  indexerUrl: string;
  privateKey: string;
};

export class ZeroGStorageArtifactStore implements ArtifactStore {
  private readonly indexer: Indexer;
  private readonly signer: Wallet;

  constructor(private readonly config: ZeroGStorageConfig) {
    if (config.chainId !== 16602) throw new Error("0G Galileo Storage requires chain ID 16602");
    if (!config.rpcUrl || !config.indexerUrl) throw new Error("0G RPC and Storage Indexer URLs are required");
    if (!/^0x[0-9a-fA-F]{64}$/.test(config.privateKey)) throw new Error("PRIVATE_KEY must be a 32-byte hexadecimal private key");
    this.indexer = new Indexer(config.indexerUrl);
    this.signer = new Wallet(config.privateKey, new JsonRpcProvider(config.rpcUrl, config.chainId));
  }

  async put(key: string, content: Uint8Array): Promise<ArtifactReference> {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key)) throw new Error("Invalid artifact key");
    const directory = await mkdtemp(join(tmpdir(), "aethed-0g-"));
    const path = join(directory, "artifact");
    await writeFile(path, content, { mode: 0o600 });
    const file = await ZgFile.fromFilePath(path);
    try {
      const [tree, treeError] = await file.merkleTree();
      if (treeError || !tree) throw treeError ?? new Error("0G Storage did not generate a Merkle tree");
      const expectedRootHash = tree.rootHash();
      if (!expectedRootHash) throw new Error("0G Storage returned an empty root hash");
      const [result, uploadError] = await this.indexer.upload(file, this.config.rpcUrl, this.signer);
      if (uploadError) throw uploadError;
      if ("rootHashes" in result) throw new Error("Unexpected multi-root upload result for a single AetheD artifact");
      if (result.rootHash !== expectedRootHash) throw new Error("0G upload root hash does not match the local Merkle root");
      return { provider: "0g", reference: result.rootHash, contentHash: result.rootHash, transactionHash: result.txHash };
    } finally {
      await file.close();
      await rm(directory, { recursive: true, force: true });
    }
  }

  async get(rootHash: string): Promise<Uint8Array> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(rootHash)) throw new Error("Invalid 0G Storage root hash");
    const [blob, error] = await this.indexer.downloadToBlob(rootHash, { proof: true });
    if (error) throw error;
    return new Uint8Array(await blob.arrayBuffer());
  }
}
