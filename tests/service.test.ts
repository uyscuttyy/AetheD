import { rm } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  InMemoryDatasetRepository, InMemoryVerificationQueue, LocalArtifactStore,
  parseDataset, VerificationApplicationService
} from "../packages/domain/src/index.js";

describe("VerificationApplicationService", () => {
  it("moves a submitted dataset from queued verification to published", async () => {
    const root = "/tmp/aethed-service-test";
    await rm(root, { recursive: true, force: true });
    const repository = new InMemoryDatasetRepository();
    const service = new VerificationApplicationService(
      repository, new InMemoryVerificationQueue(), new LocalArtifactStore(root)
    );
    const rawBytes = new TextEncoder().encode('[{"id":1,"text":"hello"}]');
    const dataset = parseDataset("demo.json", rawBytes);
    const ids = await service.submit({
      sellerAddress: "0x123", name: "Demo", description: "Synthetic demo",
      category: "research", version: "1.0", dataset, rawBytes
    });
    expect((await repository.getVerification(ids.verificationId))?.status).toBe("queued");
    await service.processPending();
    expect((await repository.getVerification(ids.verificationId))?.status).toBe("completed");
    expect((await repository.getDataset(ids.datasetId))?.status).toBe("published");
    expect((await repository.getVersion(ids.versionId))?.contentHash).toMatch(/^sha256:/);
    await rm(root, { recursive: true, force: true });
  });
});
