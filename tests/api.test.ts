import { rm } from "node:fs/promises";
import { beforeEach, describe, expect, it } from "vitest";
import {
  AetheDApi, InMemoryDatasetRepository, InMemoryVerificationQueue,
  LocalArtifactStore, VerificationApplicationService
} from "../packages/domain/src/index.js";

const root = "/tmp/aethed-api-test";

function setup() {
  const repository = new InMemoryDatasetRepository();
  const service = new VerificationApplicationService(
    repository, new InMemoryVerificationQueue(), new LocalArtifactStore(root)
  );
  return { api: new AetheDApi(repository, service), repository };
}

describe("AetheD API", () => {
  beforeEach(async () => { await rm(root, { recursive: true, force: true }); });

  it("submits, verifies, searches, and returns a dataset", async () => {
    const { api } = setup();
    const submitted = await api.submitDataset({
      sellerAddress: "0x123", name: "Crypto Sentiment Pro", description: "Synthetic sentiment records",
      category: "finance", version: "1.0", filename: "sentiment.json",
      content: '[{"text":"market up","label":"positive"},{"text":"market down","label":"negative"}]'
    });
    expect(submitted.status).toBe(202);
    const ids = (submitted.body as { data: { datasetId: string; verificationId: string } }).data;
    expect((await api.search({ q: "crypto" })).body).toEqual({ data: [], meta: { count: 0 } });
    await api.processVerifications();
    const verification = await api.getVerification(ids.verificationId);
    expect(verification.status).toBe(200);
    const search = await api.search({ q: "crypto", category: "finance", format: "json" });
    expect(search.status).toBe(200);
    expect((search.body as { data: unknown[] }).data).toHaveLength(1);
    expect((await api.getDataset(ids.datasetId)).status).toBe(200);
  });

  it("returns stable client errors", async () => {
    const { api } = setup();
    const invalid = await api.submitDataset({
      sellerAddress: "0x123", name: "Bad", description: "", category: "test",
      version: "1.0", filename: "bad.xml", content: "<xml />"
    });
    expect(invalid.status).toBe(422);
    expect(invalid.body).toEqual({ error: { code: "UNSUPPORTED_FORMAT", message: "Unsupported dataset format: xml" } });
    expect((await api.getDataset("missing")).status).toBe(404);
  });

  it("applies score and result limits", async () => {
    const { api } = setup();
    const submitted = await api.submitDataset({
      sellerAddress: "0x123", name: "Demo", description: "Synthetic", category: "research",
      version: "1.0", filename: "demo.json", content: '[{"id":1}]'
    });
    expect(submitted.status).toBe(202);
    await api.processVerifications();
    expect((await api.search({ minScore: 99, limit: 1000 })).body).toEqual({ data: [], meta: { count: 0 } });
  });
});
