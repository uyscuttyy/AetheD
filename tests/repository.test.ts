import { describe, expect, it } from "vitest";
import { InMemoryDatasetRepository, InMemoryVerificationQueue } from "../packages/domain/src/index.js";

describe("repository and queue boundaries", () => {
  it("preserves dataset versions and verification state", async () => {
    const repository = new InMemoryDatasetRepository();
    const dataset = await repository.createDataset({
      sellerAddress: "0x123", name: "Demo", description: "Synthetic demo", category: "research", status: "draft"
    });
    const version = await repository.createVersion({
      datasetId: dataset.id, version: "1.0", format: "json", sizeBytes: 2, recordCount: 0, contentHash: "sha256:test"
    });
    const verification = await repository.createVerification({ datasetVersionId: version.id });
    expect(verification.status).toBe("queued");
    expect((await repository.getVersion(version.id))?.datasetId).toBe(dataset.id);
  });

  it("processes queued work once", async () => {
    const queue = new InMemoryVerificationQueue();
    const processed: string[] = [];
    await queue.enqueue({ verificationId: "verification_1", datasetVersionId: "version_1" });
    await queue.consume(async (job) => { processed.push(job.verificationId); });
    expect(processed).toEqual(["verification_1"]);
  });
});
