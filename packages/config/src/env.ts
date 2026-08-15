export type AetheDEnv = {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  redisUrl: string;
  apiPort: number;
  webOrigin: string;
  ogChainRpcUrl?: string | undefined;
  ogChainId?: number | undefined;
  ogStorageEndpoint?: string | undefined;
  ogStorageAccessKey?: string | undefined;
  ogComputeEndpoint?: string | undefined;
  ogContractAddress?: string | undefined;
};

const optional = (value: string | undefined): string | undefined =>
  value && value.length > 0 ? value : undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AetheDEnv {
  const nodeEnv = source.NODE_ENV ?? "development";
  if (nodeEnv !== "development" && nodeEnv !== "test" && nodeEnv !== "production") {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  const databaseUrl = source.DATABASE_URL;
  const redisUrl = source.REDIS_URL;
  if (!databaseUrl || !redisUrl) {
    throw new Error("DATABASE_URL and REDIS_URL are required");
  }

  const apiPort = Number(source.API_PORT ?? "4000");
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error("API_PORT must be a valid TCP port");
  }

  const ogChainId = optional(source.OG_CHAIN_ID);
  return {
    nodeEnv,
    databaseUrl,
    redisUrl,
    apiPort,
    webOrigin: source.WEB_ORIGIN ?? "http://localhost:3000",
    ogChainRpcUrl: optional(source.OG_CHAIN_RPC_URL),
    ogChainId: ogChainId ? Number(ogChainId) : undefined,
    ogStorageEndpoint: optional(source.OG_STORAGE_ENDPOINT),
    ogStorageAccessKey: optional(source.OG_STORAGE_ACCESS_KEY),
    ogComputeEndpoint: optional(source.OG_COMPUTE_ENDPOINT),
    ogContractAddress: optional(source.OG_CONTRACT_ADDRESS)
  };
}
