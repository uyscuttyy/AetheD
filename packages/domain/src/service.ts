import { ArtifactStore } from "./artifact.js";
import { DatasetRepository } from "./repository.js";
import { VerificationJobQueue } from "./jobs.js";
import { ParsedDataset } from "./dataset.js";
import { runVerification } from "./pipeline.js";
import type { DatasetRegistryPublisher } from "./registry.js";

export type SubmitDatasetInput = {
  sellerAddress: string;
  name: string;
  description: string;
  category: string;
  version: string;
  dataset: ParsedDataset;
  rawBytes: Uint8Array;
};

export interface VerificationInputStore {
  put(verificationId: string, input: SubmitDatasetInput): Promise<void>;
  get(verificationId: string): Promise<SubmitDatasetInput | undefined>;
  delete(verificationId: string): Promise<void>;
}

export class InMemoryVerificationInputStore implements VerificationInputStore {
  private readonly inputs = new Map<string, SubmitDatasetInput>();
  async put(id: string, input: SubmitDatasetInput) { this.inputs.set(id, input); }
  async get(id: string) { return this.inputs.get(id); }
  async delete(id: string) { this.inputs.delete(id); }
}

export class VerificationApplicationService {
  constructor(
    private readonly repository: DatasetRepository,
    private readonly queue: VerificationJobQueue,
    private readonly artifactStore: ArtifactStore,
    private readonly inputStore: VerificationInputStore = new InMemoryVerificationInputStore(),
    private readonly registryPublisher?: DatasetRegistryPublisher
  ) {}

  async submit(input: SubmitDatasetInput): Promise<{ datasetId: string; versionId: string; verificationId: string }> {
    if (this.registryPublisher && input.sellerAddress.toLowerCase() !== this.registryPublisher.sellerAddress.toLowerCase()) {
      throw new Error(`Chain-enabled submissions must use the configured seller address ${this.registryPublisher.sellerAddress}`);
    }
    const dataset = await this.repository.createDataset({
      sellerAddress: input.sellerAddress, name: input.name, description: input.description,
      category: input.category, status: "verifying"
    });
    const version = await this.repository.createVersion({
      datasetId: dataset.id, version: input.version, format: input.dataset.format,
      sizeBytes: input.dataset.byteLength, recordCount: input.dataset.records.length, contentHash: "pending"
    });
    const verification = await this.repository.createVerification({ datasetVersionId: version.id });
    await this.inputStore.put(verification.id, input);
    await this.queue.enqueue({ verificationId: verification.id, datasetVersionId: version.id });
    return { datasetId: dataset.id, versionId: version.id, verificationId: verification.id };
  }

  async processPending(): Promise<void> {
    await this.queue.consume(async (job) => {
      const input = await this.inputStore.get(job.verificationId);
      if (!input) throw new Error(`Verification input missing for ${job.verificationId}`);
      await this.repository.updateVerification(job.verificationId, { status: "running" });
      let completed = false;
      try {
        const version = await this.repository.getVersion(job.datasetVersionId);
        if (!version) throw new Error("Dataset version not found");
        const storedDataset = await this.artifactStore.put(`datasets/${version.datasetId}/${version.version}`, input.rawBytes);
        const artifact = await runVerification({
          datasetId: version.datasetId, version: version.version, name: input.name,
          dataset: input.dataset, rawBytes: input.rawBytes,
          storage: { provider: storedDataset.provider, reference: storedDataset.reference }
        });
        const bytes = new TextEncoder().encode(JSON.stringify(artifact));
        await this.artifactStore.put(`verifications/${job.verificationId}.json`, bytes);
        const registryPublication = this.registryPublisher
          ? await this.registryPublisher.publish({
              datasetId: version.datasetId,
              versionId: version.id,
              sellerAddress: input.sellerAddress,
              datasetHash: artifact.profile.contentHash,
              passportHash: artifact.passport.passportHash,
              storageRoot: storedDataset.reference
            })
          : undefined;
        await this.repository.updateVersion(version.id, {
          contentHash: artifact.profile.contentHash, recordCount: artifact.profile.recordCount
        });
        await this.repository.updateDataset(version.datasetId, { status: "published" });
        await this.repository.updateVerification(job.verificationId, {
          status: "completed", profile: artifact.profile, score: artifact.score,
          passport: artifact.passport,
          ...(registryPublication ? { registryPublication } : {}),
          completedAt: new Date().toISOString()
        });
        completed = true;
      } catch (error) {
        const version = await this.repository.getVersion(job.datasetVersionId);
        if (version) await this.repository.updateDataset(version.datasetId, { status: "failed" });
        await this.repository.updateVerification(job.verificationId, {
          status: "failed", error: error instanceof Error ? error.message : "Unknown verification error",
          completedAt: new Date().toISOString()
        });
        throw error;
      } finally {
        if (completed) await this.inputStore.delete(job.verificationId);
      }
    });
  }
}
