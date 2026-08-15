import { DatasetStatus as DbDatasetStatus, EvidenceKind as DbEvidenceKind, Prisma, PrismaClient, VerificationStatus as DbVerificationStatus } from "@prisma/client";
import type { DatasetEntity, DatasetRepository, DatasetStatus, DatasetVersionRecord, VerificationRecord } from "../../domain/src/repository.js";
import type { EvidenceKind } from "../../domain/src/verification.js";
import type { VerificationProfile } from "../../domain/src/verification.js";
import type { AetheScoreResult } from "../../domain/src/scoring.js";
import type { DataPassport } from "../../domain/src/passport.js";

const datasetToDb: Record<DatasetStatus, DbDatasetStatus> = { draft: "DRAFT", verifying: "VERIFYING", published: "PUBLISHED", failed: "FAILED" };
const datasetFromDb: Record<DbDatasetStatus, DatasetStatus> = { DRAFT: "draft", VERIFYING: "verifying", PUBLISHED: "published", FAILED: "failed" };
const verificationToDb: Record<VerificationRecord["status"], DbVerificationStatus> = { queued: "QUEUED", running: "RUNNING", completed: "COMPLETED", failed: "FAILED" };
const verificationFromDb: Record<DbVerificationStatus, VerificationRecord["status"]> = { QUEUED: "queued", RUNNING: "running", COMPLETED: "completed", FAILED: "failed" };
const evidenceToDb: Record<EvidenceKind, DbEvidenceKind> = { measured: "MEASURED", inferred: "INFERRED", sellerProvided: "SELLER_PROVIDED", unknown: "UNKNOWN" };
const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const datasetSelect = { id: true, name: true, description: true, category: true, status: true, createdAt: true, seller: { select: { walletAddress: true } } } satisfies Prisma.DatasetSelect;
type DatasetRow = Prisma.DatasetGetPayload<{ select: typeof datasetSelect }>;
type VerificationRow = Prisma.VerificationGetPayload<{ include: { passport: true } }>;

const mapDataset = (row: DatasetRow): DatasetEntity => ({
  id: row.id, sellerAddress: row.seller.walletAddress, name: row.name, description: row.description,
  category: row.category, status: datasetFromDb[row.status], createdAt: row.createdAt.toISOString()
});

const mapVersion = (row: Prisma.DatasetVersionGetPayload<Record<string, never>>): DatasetVersionRecord => {
  const sizeBytes = Number(row.sizeBytes);
  if (!Number.isSafeInteger(sizeBytes)) throw new Error("Dataset version size exceeds JavaScript's safe integer range");
  return { id: row.id, datasetId: row.datasetId, version: row.version, format: row.format, sizeBytes, recordCount: row.recordCount, contentHash: row.contentHash, createdAt: row.createdAt.toISOString() };
};

const mapVerification = (row: VerificationRow): VerificationRecord => ({
  id: row.id, datasetVersionId: row.datasetVersionId, status: verificationFromDb[row.status],
  ...(row.profile ? { profile: row.profile as VerificationProfile } : {}),
  ...(row.score ? { score: row.score as AetheScoreResult } : {}),
  ...(row.passport ? { passport: row.passport.payload as DataPassport } : {}),
  ...(row.error ? { error: row.error } : {}), createdAt: row.createdAt.toISOString(),
  ...(row.completedAt ? { completedAt: row.completedAt.toISOString() } : {})
});

export class PrismaDatasetRepository implements DatasetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDataset(input: Omit<DatasetEntity, "id" | "createdAt">): Promise<DatasetEntity> {
    return mapDataset(await this.prisma.dataset.create({
      data: { name: input.name, description: input.description, category: input.category, status: datasetToDb[input.status], seller: { connectOrCreate: { where: { walletAddress: input.sellerAddress }, create: { walletAddress: input.sellerAddress } } } },
      select: datasetSelect
    }));
  }

  async createVersion(input: Omit<DatasetVersionRecord, "id" | "createdAt">): Promise<DatasetVersionRecord> {
    return mapVersion(await this.prisma.datasetVersion.create({ data: { ...input, sizeBytes: BigInt(input.sizeBytes) } }));
  }

  async createVerification(input: Omit<VerificationRecord, "id" | "createdAt" | "status">): Promise<VerificationRecord> {
    return mapVerification(await this.prisma.verification.create({ data: { datasetVersionId: input.datasetVersionId, pipelineVersion: "1.0.0" }, include: { passport: true } }));
  }

  async updateDataset(id: string, update: Partial<Pick<DatasetEntity, "status">>): Promise<DatasetEntity> {
    return mapDataset(await this.prisma.dataset.update({ where: { id }, data: update.status ? { status: datasetToDb[update.status] } : {}, select: datasetSelect }));
  }

  async updateVersion(id: string, update: Partial<Pick<DatasetVersionRecord, "contentHash" | "recordCount">>): Promise<DatasetVersionRecord> {
    return mapVersion(await this.prisma.datasetVersion.update({ where: { id }, data: update }));
  }

  async updateVerification(id: string, update: Partial<Pick<VerificationRecord, "status" | "profile" | "score" | "passport" | "error" | "completedAt">>): Promise<VerificationRecord> {
    await this.prisma.$transaction(async (tx) => {
      await tx.verification.update({ where: { id }, data: {
        ...(update.status ? { status: verificationToDb[update.status] } : {}),
        ...(update.profile ? { profile: asJson(update.profile) } : {}),
        ...(update.score ? { score: asJson(update.score), totalScore: update.score.score, confidence: update.score.confidence, limitations: asJson(update.score.limitations) } : {}),
        ...(update.error !== undefined ? { error: update.error } : {}),
        ...(update.completedAt ? { completedAt: new Date(update.completedAt) } : {})
      } });
      if (update.profile) for (const [name, dimension] of Object.entries(update.profile.dimensions)) {
        const values = { score: dimension.score ?? null, confidence: dimension.confidence, evidenceKind: evidenceToDb[dimension.evidenceKind], signals: asJson(dimension.signals), limitations: asJson(dimension.limitations) };
        await tx.verificationDimension.upsert({ where: { verificationId_name: { verificationId: id, name } }, create: { verificationId: id, name, ...values }, update: values });
      }
      if (update.passport) await tx.dataPassport.upsert({
        where: { verificationId: id },
        create: { verificationId: id, passportVersion: update.passport.passportVersion, passportHash: update.passport.passportHash, generatedAt: new Date(update.passport.generatedAt), payload: asJson(update.passport) },
        update: { passportVersion: update.passport.passportVersion, passportHash: update.passport.passportHash, generatedAt: new Date(update.passport.generatedAt), payload: asJson(update.passport) }
      });
    });
    return mapVerification(await this.prisma.verification.findUniqueOrThrow({ where: { id }, include: { passport: true } }));
  }

  async getDataset(id: string): Promise<DatasetEntity | undefined> { const row = await this.prisma.dataset.findUnique({ where: { id }, select: datasetSelect }); return row ? mapDataset(row) : undefined; }
  async getVersion(id: string): Promise<DatasetVersionRecord | undefined> { const row = await this.prisma.datasetVersion.findUnique({ where: { id } }); return row ? mapVersion(row) : undefined; }
  async getVerification(id: string): Promise<VerificationRecord | undefined> { const row = await this.prisma.verification.findUnique({ where: { id }, include: { passport: true } }); return row ? mapVerification(row) : undefined; }
  async listDatasets(): Promise<DatasetEntity[]> { return (await this.prisma.dataset.findMany({ orderBy: { createdAt: "asc" }, select: datasetSelect })).map(mapDataset); }
  async listVersions(datasetId: string): Promise<DatasetVersionRecord[]> { return (await this.prisma.datasetVersion.findMany({ where: { datasetId }, orderBy: { createdAt: "asc" } })).map(mapVersion); }
  async findLatestVerification(datasetVersionId: string): Promise<VerificationRecord | undefined> { const row = await this.prisma.verification.findFirst({ where: { datasetVersionId }, orderBy: { createdAt: "desc" }, include: { passport: true } }); return row ? mapVerification(row) : undefined; }
}
