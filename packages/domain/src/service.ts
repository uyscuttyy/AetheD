import { ArtifactStore } from "./artifact.js";
import { DatasetRepository } from "./repository.js";
import { VerificationJobQueue } from "./jobs.js";
import { ParsedDataset } from "./dataset.js";
import { runVerification } from "./pipeline.js";

export type SubmitDatasetInput = {
  sellerAddress: string;
  name: string;
  description: string;
  category: string;
  version: string;
  dataset: ParsedDataset;
  rawBytes: Uint8Array;
};

export class VerificationApplicationService {
  private readonly pendingInputs = new Map<string, SubmitDatasetInput>();

  constructor(
    private readonly repository: DatasetRepository,
    private readonly queue: VerificationJobQueue,
    private readonly artifactStore: ArtifactStore
  ) {}

  async submit(input: SubmitDatasetInput): Promise<{ datasetId: string; versionId: string; verificationId: string }> {
    const dataset = await this.repository.createDataset({
      sellerAddress: input.sellerAddress, name: input.name, description: input.description,
      category: input.category, status: "verifying"
    });
    const version = await this.repository.createVersion({
      datasetId: dataset.id, version: input.version, format: input.dataset.format,
      sizeBytes: input.dataset.byteLength, recordCount: input.dataset.records.length, contentHash: "pending"
    });
    const verification = await this.repository.createVerification({ datasetVersionId: version.id });
    this.pendingInputs.set(verification.id, input);
    await this.queue.enqueue({ verificationId: verification.id, datasetVersionId: version.id });
    return { datasetId: dataset.id, versionId: version.id, verificationId: verification.id };
  }

  async processPending(): Promise<void> {
    await this.queue.consume(async (job) => {
      const input = this.pendingInputs.get(job.verificationId);
      if (!input) throw new Error(`Verification input missing for ${job.verificationId}`);
      await this.repository.updateVerification(job.verificationId, { status: "running" });
      try {
        const version = await this.repository.getVersion(job.datasetVersionId);
        if (!version) throw new Error("Dataset version not found");
        const artifact = await runVerification({
          datasetId: version.datasetId, version: version.version, name: input.name,
          dataset: input.dataset, rawBytes: input.rawBytes
        });
        const bytes = new TextEncoder().encode(JSON.stringify(artifact));
        await this.artifactStore.put(`verifications/${job.verificationId}.json`, bytes);
        await this.repository.updateVersion(version.id, {
          contentHash: artifact.profile.contentHash, recordCount: artifact.profile.recordCount
        });
        await this.repository.updateDataset(version.datasetId, { status: "published" });
        await this.repository.updateVerification(job.verificationId, {
          status: "completed", profile: artifact.profile, score: artifact.score,
          passport: artifact.passport, completedAt: new Date().toISOString()
        });
      } catch (error) {
        const version = await this.repository.getVersion(job.datasetVersionId);
        if (version) await this.repository.updateDataset(version.datasetId, { status: "failed" });
        await this.repository.updateVerification(job.verificationId, {
          status: "failed", error: error instanceof Error ? error.message : "Unknown verification error",
          completedAt: new Date().toISOString()
        });
      } finally {
        this.pendingInputs.delete(job.verificationId);
      }
    });
  }
}
