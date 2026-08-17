import { LocalArtifactStore, type ArtifactStore } from "../../domain/src/index.js";
import { ZeroGStorageArtifactStore } from "./zero-g-storage.js";

export function createRuntimeArtifactStore(input: {
  provider: "local" | "0g";
  localRoot: string;
  chainId?: number | undefined;
  rpcUrl?: string | undefined;
  indexerUrl?: string | undefined;
  privateKey?: string | undefined;
}): ArtifactStore {
  if (input.provider === "local") return new LocalArtifactStore(input.localRoot);
  if (!input.chainId || !input.rpcUrl || !input.indexerUrl || !input.privateKey) throw new Error("Incomplete 0G Storage configuration");
  return new ZeroGStorageArtifactStore({ chainId: input.chainId, rpcUrl: input.rpcUrl, indexerUrl: input.indexerUrl, privateKey: input.privateKey });
}
