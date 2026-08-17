export type AetheDEnv = {
  nodeEnv: "development" | "test" | "production";
  persistenceProvider: "memory" | "postgresql";
  databaseUrl: string | undefined;
  redisUrl: string;
  apiHost: string;
  apiPort: number;
  maxUploadBytes: number;
  artifactRoot: string;
  artifactStoreProvider: "local" | "0g";
  webOrigin: string;
  ogChainRpcUrl?: string | undefined;
  ogNetwork?: string | undefined;
  ogChainId?: number | undefined;
  ogStorageIndexerUrl?: string | undefined;
  privateKey?: string | undefined;
  ogStorageEndpoint?: string | undefined;
  ogStorageAccessKey?: string | undefined;
  ogComputeEndpoint?: string | undefined;
  ogContractAddress?: string | undefined;
  ogRegistryDefaultPriceWei: bigint;
};

const optional = (value: string | undefined): string | undefined =>
  value && value.length > 0 ? value : undefined;

const optionalContractAddress = (value: string | undefined): string | undefined => {
  const address = optional(value);
  if (!address) return undefined;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address) || /^0x0{40}$/i.test(address)) {
    throw new Error("OG_CONTRACT_ADDRESS must be a non-zero EVM contract address");
  }
  return address;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AetheDEnv {
  const nodeEnv = source.NODE_ENV;
  if (nodeEnv !== "development" && nodeEnv !== "test" && nodeEnv !== "production") {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  const persistenceProvider = source.PERSISTENCE_PROVIDER;
  if (persistenceProvider !== "memory" && persistenceProvider !== "postgresql") {
    throw new Error("PERSISTENCE_PROVIDER must be memory or postgresql");
  }
  if (nodeEnv === "production" && persistenceProvider !== "postgresql") {
    throw new Error("Production requires PERSISTENCE_PROVIDER=postgresql");
  }
  const databaseUrl = optional(source.DATABASE_URL);
  const redisUrl = source.REDIS_URL;
  if (persistenceProvider === "postgresql" && !databaseUrl) throw new Error("DATABASE_URL is required for PostgreSQL persistence");
  if (!redisUrl) throw new Error("REDIS_URL is required");

  const apiHost = source.API_HOST;
  const artifactRoot = source.AETHED_ARTIFACT_ROOT;
  const webOrigin = source.WEB_ORIGIN;
  if (!apiHost || !artifactRoot || !webOrigin) throw new Error("API_HOST, AETHED_ARTIFACT_ROOT, and WEB_ORIGIN are required");
  const artifactStoreProvider = source.ARTIFACT_STORE_PROVIDER;
  if (artifactStoreProvider !== "local" && artifactStoreProvider !== "0g") throw new Error("ARTIFACT_STORE_PROVIDER must be local or 0g");
  if (nodeEnv === "production" && artifactStoreProvider !== "0g") throw new Error("Production requires ARTIFACT_STORE_PROVIDER=0g");

  const apiPort = Number(source.API_PORT);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error("API_PORT must be a valid TCP port");
  }
  const maxUploadBytes = Number(source.MAX_UPLOAD_BYTES);
  if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes < 1) throw new Error("MAX_UPLOAD_BYTES must be a positive integer");

  const ogChainId = optional(source.OG_CHAIN_ID);
  const ogNetwork = optional(source.OG_NETWORK);
  const ogStorageIndexerUrl = optional(source.OG_STORAGE_INDEXER_URL ?? source.OG_STORAGE_ENDPOINT);
  const privateKey = optional(source.PRIVATE_KEY);
  const registryDefaultPrice = optional(source.OG_REGISTRY_DEFAULT_PRICE_WEI) ?? "0";
  if (ogNetwork && ogNetwork !== "galileo-testnet") throw new Error("OG_NETWORK must be galileo-testnet for this milestone");
  if (ogChainId && Number(ogChainId) !== 16602) throw new Error("OG_CHAIN_ID must be 16602 for Galileo Testnet");
  if (privateKey && !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error("PRIVATE_KEY must be a 32-byte hexadecimal private key");
  if (!/^\d+$/.test(registryDefaultPrice)) throw new Error("OG_REGISTRY_DEFAULT_PRICE_WEI must be a non-negative integer");
  const ogContractAddress = optionalContractAddress(source.OG_CONTRACT_ADDRESS);
  if (ogContractAddress && (!privateKey || !optional(source.OG_RPC_URL ?? source.OG_CHAIN_RPC_URL) || Number(ogChainId) !== 16602)) {
    throw new Error("Galileo registry requires PRIVATE_KEY, OG_RPC_URL, and OG_CHAIN_ID=16602");
  }
  if (artifactStoreProvider === "0g" && (!privateKey || !ogStorageIndexerUrl || !optional(source.OG_RPC_URL ?? source.OG_CHAIN_RPC_URL) || Number(ogChainId) !== 16602)) {
    throw new Error("0G Storage requires PRIVATE_KEY, OG_RPC_URL, OG_STORAGE_INDEXER_URL, and OG_CHAIN_ID=16602");
  }
  return {
    nodeEnv,
    persistenceProvider,
    databaseUrl,
    redisUrl,
    apiHost,
    apiPort,
    maxUploadBytes,
    artifactRoot,
    artifactStoreProvider,
    webOrigin,
    ogChainRpcUrl: optional(source.OG_RPC_URL ?? source.OG_CHAIN_RPC_URL),
    ogNetwork,
    ogChainId: ogChainId ? Number(ogChainId) : undefined,
    ogStorageIndexerUrl,
    privateKey,
    ogStorageEndpoint: ogStorageIndexerUrl,
    ogStorageAccessKey: optional(source.OG_STORAGE_ACCESS_KEY),
    ogComputeEndpoint: optional(source.OG_COMPUTE_ENDPOINT),
    ogContractAddress,
    ogRegistryDefaultPriceWei: BigInt(registryDefaultPrice)
  };
}
