import { loadEnv } from "../../packages/config/src/env.js";
import { FileVerificationInputStore, BullMqVerificationQueue, createRuntimeArtifactStore, createRuntimePersistence, createRuntimeRegistryPublisher } from "../../packages/infrastructure/src/index.js";
import { VerificationApplicationService } from "../../packages/domain/src/index.js";

const env = loadEnv();
const persistence = createRuntimePersistence({ provider: env.persistenceProvider, databaseUrl: env.databaseUrl });
const queue = new BullMqVerificationQueue(env.redisUrl);
const service = new VerificationApplicationService(
  persistence.repository,
  queue,
  createRuntimeArtifactStore({ provider: env.artifactStoreProvider, localRoot: env.artifactRoot, chainId: env.ogChainId, rpcUrl: env.ogChainRpcUrl, indexerUrl: env.ogStorageIndexerUrl, privateKey: env.privateKey }),
  new FileVerificationInputStore(`${env.artifactRoot}/inputs`),
  createRuntimeRegistryPublisher({ chainId: env.ogChainId, rpcUrl: env.ogChainRpcUrl, contractAddress: env.ogContractAddress, privateKey: env.privateKey, defaultPriceWei: env.ogRegistryDefaultPriceWei })
);

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await queue.close();
  await persistence.close();
  process.exit(0);
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

async function main() {
  console.log("AetheD verification worker started");
  while (!stopping) {
    await service.processPending();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

void main();
