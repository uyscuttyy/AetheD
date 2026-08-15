import { DataPassport } from "./passport.js";
import { AetheScoreResult } from "./scoring.js";
import { VerificationProfile } from "./verification.js";

export type DatasetStatus = "draft" | "verifying" | "published" | "failed";

export type DatasetEntity = {
  id: string;
  sellerAddress: string;
  name: string;
  description: string;
  category: string;
  status: DatasetStatus;
  createdAt: string;
};

export type DatasetVersionRecord = {
  id: string;
  datasetId: string;
  version: string;
  format: string;
  sizeBytes: number;
  recordCount: number;
  contentHash: string;
  createdAt: string;
};

export type VerificationRecord = {
  id: string;
  datasetVersionId: string;
  status: "queued" | "running" | "completed" | "failed";
  profile?: VerificationProfile;
  score?: AetheScoreResult;
  passport?: DataPassport;
  error?: string;
  createdAt: string;
  completedAt?: string;
};

export interface DatasetRepository {
  createDataset(input: Omit<DatasetEntity, "id" | "createdAt">): Promise<DatasetEntity>;
  createVersion(input: Omit<DatasetVersionRecord, "id" | "createdAt">): Promise<DatasetVersionRecord>;
  createVerification(input: Omit<VerificationRecord, "id" | "createdAt" | "status">): Promise<VerificationRecord>;
  updateDataset(id: string, update: Partial<Pick<DatasetEntity, "status">>): Promise<DatasetEntity>;
  updateVersion(id: string, update: Partial<Pick<DatasetVersionRecord, "contentHash" | "recordCount">>): Promise<DatasetVersionRecord>;
  updateVerification(id: string, update: Partial<Pick<VerificationRecord, "status" | "profile" | "score" | "passport" | "error" | "completedAt">>): Promise<VerificationRecord>;
  getDataset(id: string): Promise<DatasetEntity | undefined>;
  getVersion(id: string): Promise<DatasetVersionRecord | undefined>;
  getVerification(id: string): Promise<VerificationRecord | undefined>;
  listDatasets(): Promise<DatasetEntity[]>;
  listVersions(datasetId: string): Promise<DatasetVersionRecord[]>;
  findLatestVerification(datasetVersionId: string): Promise<VerificationRecord | undefined>;
}

const id = (prefix: string): string => `${prefix}_${crypto.randomUUID()}`;

export class InMemoryDatasetRepository implements DatasetRepository {
  private readonly datasets = new Map<string, DatasetEntity>();
  private readonly versions = new Map<string, DatasetVersionRecord>();
  private readonly verifications = new Map<string, VerificationRecord>();

  async createDataset(input: Omit<DatasetEntity, "id" | "createdAt">): Promise<DatasetEntity> {
    const value = { ...input, id: id("dataset"), createdAt: new Date().toISOString() };
    this.datasets.set(value.id, value);
    return value;
  }

  async createVersion(input: Omit<DatasetVersionRecord, "id" | "createdAt">): Promise<DatasetVersionRecord> {
    if (!this.datasets.has(input.datasetId)) throw new Error("Dataset not found");
    const value = { ...input, id: id("version"), createdAt: new Date().toISOString() };
    this.versions.set(value.id, value);
    return value;
  }

  async createVerification(input: Omit<VerificationRecord, "id" | "createdAt" | "status">): Promise<VerificationRecord> {
    if (!this.versions.has(input.datasetVersionId)) throw new Error("Dataset version not found");
    const value: VerificationRecord = { ...input, id: id("verification"), status: "queued", createdAt: new Date().toISOString() };
    this.verifications.set(value.id, value);
    return value;
  }

  async updateDataset(idValue: string, update: Partial<Pick<DatasetEntity, "status">>): Promise<DatasetEntity> {
    const existing = this.datasets.get(idValue);
    if (!existing) throw new Error("Dataset not found");
    const value = { ...existing, ...update };
    this.datasets.set(idValue, value);
    return value;
  }

  async updateVersion(idValue: string, update: Partial<Pick<DatasetVersionRecord, "contentHash" | "recordCount">>): Promise<DatasetVersionRecord> {
    const existing = this.versions.get(idValue);
    if (!existing) throw new Error("Dataset version not found");
    const value = { ...existing, ...update };
    this.versions.set(idValue, value);
    return value;
  }

  async updateVerification(idValue: string, update: Partial<Pick<VerificationRecord, "status" | "profile" | "score" | "passport" | "error" | "completedAt">>): Promise<VerificationRecord> {
    const existing = this.verifications.get(idValue);
    if (!existing) throw new Error("Verification not found");
    const value = { ...existing, ...update };
    this.verifications.set(idValue, value);
    return value;
  }

  async getDataset(idValue: string): Promise<DatasetEntity | undefined> { return this.datasets.get(idValue); }
  async getVersion(idValue: string): Promise<DatasetVersionRecord | undefined> { return this.versions.get(idValue); }
  async getVerification(idValue: string): Promise<VerificationRecord | undefined> { return this.verifications.get(idValue); }
  async listDatasets(): Promise<DatasetEntity[]> { return [...this.datasets.values()]; }
  async listVersions(datasetId: string): Promise<DatasetVersionRecord[]> {
    return [...this.versions.values()].filter((version) => version.datasetId === datasetId);
  }
  async findLatestVerification(datasetVersionId: string): Promise<VerificationRecord | undefined> {
    return [...this.verifications.values()]
      .filter((verification) => verification.datasetVersionId === datasetVersionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }
}
