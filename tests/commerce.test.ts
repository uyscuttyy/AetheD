import { describe, expect, it } from "vitest";
import {
  CommerceApplicationService,
  InMemoryCommerceRepository,
  InMemoryDatasetRepository,
  type ConfirmedPurchase,
  type PurchaseReceiptVerifier
} from "../packages/domain/src/index.js";

async function setup(overrides: Partial<ConfirmedPurchase> = {}) {
  const datasets = new InMemoryDatasetRepository();
  const dataset = await datasets.createDataset({ sellerAddress: "0x00000000000000000000000000000000000000aa", name: "Commerce", description: "test", category: "test", status: "published" });
  const version = await datasets.createVersion({ datasetId: dataset.id, version: "1.0", format: "json", sizeBytes: 2, recordCount: 1, contentHash: "sha256:dataset" });
  const verification = await datasets.createVerification({ datasetVersionId: version.id });
  await datasets.updateVerification(verification.id, {
    status: "completed",
    passport: {
      passportVersion: "1.0.0", datasetId: dataset.id, version: version.version, name: dataset.name,
      aetheScore: 80, confidence: 0.8, records: 1, format: "json", sizeBytes: 2,
      datasetHash: `sha256:${"11".repeat(32)}`, storage: { provider: "0g", reference: `0x${"22".repeat(32)}` },
      dimensions: {
        quality: { score: 80, confidence: 0.8, evidenceKind: "measured", signals: {}, limitations: [] },
        cleanliness: { score: 80, confidence: 0.8, evidenceKind: "measured", signals: {}, limitations: [] },
        uniqueness: { score: 80, confidence: 0.8, evidenceKind: "measured", signals: {}, limitations: [] },
        freshness: { confidence: 0, evidenceKind: "unknown", signals: {}, limitations: [] },
        consistency: { score: 80, confidence: 0.8, evidenceKind: "measured", signals: {}, limitations: [] },
        provenance: { confidence: 0, evidenceKind: "unknown", signals: {}, limitations: [] },
        aiUtility: { score: 70, confidence: 0.3, evidenceKind: "inferred", signals: {}, limitations: [] }
      }, limitations: [], generatedAt: new Date().toISOString(), passportHash: `sha256:${"33".repeat(32)}`
    },
    registryPublication: {
      chainId: 16602, contractAddress: "0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c",
      datasetKey: `0x${"44".repeat(32)}`, versionKey: `0x${"55".repeat(32)}`
    },
    completedAt: new Date().toISOString()
  });
  const confirmed: ConfirmedPurchase = {
    chainId: 16602,
    contractAddress: "0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c",
    transactionHash: `0x${"66".repeat(32)}`,
    blockNumber: 123,
    versionKey: `0x${"55".repeat(32)}`,
    buyerAddress: "0x00000000000000000000000000000000000000bb",
    sellerAddress: dataset.sellerAddress,
    priceWei: "100",
    ...overrides
  };
  const verifier: PurchaseReceiptVerifier = { verify: async () => confirmed };
  return { service: new CommerceApplicationService(datasets, new InMemoryCommerceRepository(), verifier, { verify: async () => undefined }), version, confirmed };
}

describe("CommerceApplicationService", () => {
  it("reconciles a confirmed exact-version purchase and grants artifact access", async () => {
    const { service, version, confirmed } = await setup();
    const first = await service.reconcile({ datasetVersionId: version.id, buyerAddress: confirmed.buyerAddress, transactionHash: confirmed.transactionHash });
    const second = await service.reconcile({ datasetVersionId: version.id, buyerAddress: confirmed.buyerAddress, transactionHash: confirmed.transactionHash });
    expect(second.purchase.id).toBe(first.purchase.id);
    expect(second.accessGrant.id).toBe(first.accessGrant.id);
    expect((await service.getAccess({ datasetVersionId: version.id, buyerAddress: confirmed.buyerAddress, timestamp: new Date().toISOString(), signature: "test" })).artifact).toMatchObject({ provider: "0g" });
  });

  it("rejects a receipt for a different version", async () => {
    const { service, version, confirmed } = await setup({ versionKey: `0x${"77".repeat(32)}` });
    await expect(service.reconcile({ datasetVersionId: version.id, buyerAddress: confirmed.buyerAddress, transactionHash: confirmed.transactionHash }))
      .rejects.toThrow("different dataset version");
  });

  it("denies access before a purchase is reconciled", async () => {
    const { service, version, confirmed } = await setup();
    await expect(service.getAccess({ datasetVersionId: version.id, buyerAddress: confirmed.buyerAddress, timestamp: new Date().toISOString(), signature: "test" })).rejects.toThrow("Access grant not found");
  });
});
