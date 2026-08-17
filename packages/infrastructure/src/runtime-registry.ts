import type { DatasetRegistryPublisher } from "../../domain/src/index.js";
import { GalileoRegistryPublisher } from "./galileo-registry.js";

export function createRuntimeRegistryPublisher(input: {
  chainId?: number | undefined;
  rpcUrl?: string | undefined;
  contractAddress?: string | undefined;
  privateKey?: string | undefined;
  defaultPriceWei?: bigint | undefined;
}): DatasetRegistryPublisher | undefined {
  if (!input.contractAddress) return undefined;
  if (!input.chainId || !input.rpcUrl || !input.privateKey) throw new Error("Incomplete Galileo registry configuration");
  return new GalileoRegistryPublisher({
    chainId: input.chainId,
    rpcUrl: input.rpcUrl,
    contractAddress: input.contractAddress,
    privateKey: input.privateKey,
    defaultPriceWei: input.defaultPriceWei ?? 0n
  });
}
