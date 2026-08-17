import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import { EvmAccessProofVerifier, accessProofMessage } from "../packages/infrastructure/src/index.js";

describe("EvmAccessProofVerifier", () => {
  it("accepts a fresh signature from the buyer wallet", async () => {
    const wallet = Wallet.createRandom();
    const input = { datasetVersionId: "version_1", buyerAddress: wallet.address, timestamp: new Date().toISOString() };
    const signature = await wallet.signMessage(accessProofMessage(input));
    await expect(new EvmAccessProofVerifier().verify({ ...input, signature })).resolves.toBeUndefined();
  });

  it("rejects an expired proof", async () => {
    const wallet = Wallet.createRandom();
    const input = { datasetVersionId: "version_1", buyerAddress: wallet.address, timestamp: new Date(0).toISOString() };
    const signature = await wallet.signMessage(accessProofMessage(input));
    await expect(new EvmAccessProofVerifier().verify({ ...input, signature })).rejects.toThrow("expired");
  });
});
