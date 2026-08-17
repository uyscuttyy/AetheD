import { describe, expect, it } from "vitest";
import { loadEnv } from "../packages/config/src/env.js";

describe("loadEnv", () => {
  it("loads required local configuration", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      PERSISTENCE_PROVIDER: "postgresql",
      DATABASE_URL: "postgres://localhost/aethed",
      REDIS_URL: "redis://localhost:6379",
      API_HOST: "127.0.0.1",
      API_PORT: "4100",
      MAX_UPLOAD_BYTES: "26214400",
      AETHED_ARTIFACT_ROOT: "/tmp/aethed-test-artifacts",
      ARTIFACT_STORE_PROVIDER: "local",
      WEB_ORIGIN: "http://localhost:3000"
    });

    expect(env.apiPort).toBe(4100);
    expect(env.nodeEnv).toBe("test");
  });

  it("rejects missing required configuration", () => {
    expect(() => loadEnv({ NODE_ENV: "test" })).toThrow(
      "PERSISTENCE_PROVIDER must be memory or postgresql"
    );
  });

  it("rejects memory persistence in production", () => {
    expect(() => loadEnv({
      NODE_ENV: "production", PERSISTENCE_PROVIDER: "memory", REDIS_URL: "redis://redis:6379",
      API_HOST: "0.0.0.0", API_PORT: "4000", MAX_UPLOAD_BYTES: "26214400",
      AETHED_ARTIFACT_ROOT: "/data/artifacts", WEB_ORIGIN: "https://aethed.example"
      , ARTIFACT_STORE_PROVIDER: "local"
    })).toThrow("Production requires PERSISTENCE_PROVIDER=postgresql");
  });

  it("leaves contract integration disabled when no address is configured", () => {
    const env = loadEnv({
      NODE_ENV: "test", PERSISTENCE_PROVIDER: "memory", REDIS_URL: "redis://localhost:6379",
      API_HOST: "127.0.0.1", API_PORT: "4100", MAX_UPLOAD_BYTES: "26214400",
      AETHED_ARTIFACT_ROOT: "/tmp/aethed-test-artifacts", ARTIFACT_STORE_PROVIDER: "local",
      WEB_ORIGIN: "http://localhost:3000", OG_CONTRACT_ADDRESS: ""
    });

    expect(env.ogContractAddress).toBeUndefined();
  });

  it("rejects placeholder or malformed contract addresses", () => {
    const base: NodeJS.ProcessEnv = {
      NODE_ENV: "test", PERSISTENCE_PROVIDER: "memory", REDIS_URL: "redis://localhost:6379",
      API_HOST: "127.0.0.1", API_PORT: "4100", MAX_UPLOAD_BYTES: "26214400",
      AETHED_ARTIFACT_ROOT: "/tmp/aethed-test-artifacts", ARTIFACT_STORE_PROVIDER: "local",
      WEB_ORIGIN: "http://localhost:3000"
    };

    expect(() => loadEnv({ ...base, OG_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000" }))
      .toThrow("OG_CONTRACT_ADDRESS must be a non-zero EVM contract address");
    expect(() => loadEnv({ ...base, OG_CONTRACT_ADDRESS: "not-an-address" }))
      .toThrow("OG_CONTRACT_ADDRESS must be a non-zero EVM contract address");
  });

  it("loads a complete Galileo registry configuration", () => {
    const env = loadEnv({
      NODE_ENV: "test", PERSISTENCE_PROVIDER: "memory", REDIS_URL: "redis://localhost:6379",
      API_HOST: "127.0.0.1", API_PORT: "4100", MAX_UPLOAD_BYTES: "26214400",
      AETHED_ARTIFACT_ROOT: "/tmp/aethed-test-artifacts", ARTIFACT_STORE_PROVIDER: "local",
      WEB_ORIGIN: "http://localhost:3000", OG_CHAIN_ID: "16602", OG_RPC_URL: "https://evmrpc-testnet.0g.ai",
      PRIVATE_KEY: `0x${"11".repeat(32)}`, OG_CONTRACT_ADDRESS: "0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c",
      OG_REGISTRY_DEFAULT_PRICE_WEI: "1000000000000000"
    });

    expect(env.ogContractAddress).toBe("0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c");
    expect(env.ogRegistryDefaultPriceWei).toBe(1000000000000000n);
  });
});
