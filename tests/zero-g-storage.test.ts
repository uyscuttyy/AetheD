import { describe, expect, it } from "vitest";
import { createRuntimeArtifactStore, ZeroGStorageArtifactStore } from "../packages/infrastructure/src/index.js";

describe("0G Storage adapter", () => {
  it("rejects a missing or malformed private key", () => {
    expect(() => new ZeroGStorageArtifactStore({
      chainId: 16602,
      rpcUrl: "https://evmrpc-testnet.0g.ai",
      indexerUrl: "https://indexer-storage-testnet-standard.0g.ai",
      privateKey: ""
    })).toThrow("PRIVATE_KEY");
  });

  it("keeps local storage available only through explicit selection", () => {
    expect(createRuntimeArtifactStore({ provider: "local", localRoot: "/tmp/aethed-artifacts" })).toBeDefined();
  });

  it.skipIf(process.env.OG_STORAGE_INTEGRATION !== "true")("uploads and retrieves a real Galileo testnet artifact", async () => {
    const store = new ZeroGStorageArtifactStore({
      chainId: Number(process.env.OG_CHAIN_ID),
      rpcUrl: process.env.OG_RPC_URL!,
      indexerUrl: process.env.OG_STORAGE_INDEXER_URL!,
      privateKey: process.env.PRIVATE_KEY!
    });
    const content = new TextEncoder().encode(`AetheD Galileo integration ${Date.now()}`);
    const uploaded = await store.put("integration/galileo.txt", content);
    expect(uploaded.provider).toBe("0g");
    expect(uploaded.reference).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(uploaded.transactionHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(await store.get(uploaded.reference)).toEqual(content);
  }, 180_000);
});
