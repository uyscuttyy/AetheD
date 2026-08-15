import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseDataset, runVerification } from "../packages/domain/src/index.js";
import { PrismaDatasetRepository } from "../packages/infrastructure/src/index.js";

const suite = describe.skipIf(!process.env.DATABASE_URL);

suite("PrismaDatasetRepository", () => {
  const prisma = new PrismaClient();
  const repository = new PrismaDatasetRepository(prisma);

  beforeAll(() => prisma.$connect());
  afterAll(() => prisma.$disconnect());

  it("round-trips versioned verification and passport records", async () => {
    const dataset = await repository.createDataset({ sellerAddress: `0x${crypto.randomUUID().replaceAll("-", "")}`, name: "Persistence test", description: "Synthetic", category: "test", status: "draft" });
    const source = JSON.stringify([{ text: "hello", label: "positive" }, { text: "world", label: "negative" }]);
    const parsed = parseDataset("data.json", source);
    const version = await repository.createVersion({ datasetId: dataset.id, version: "1.0", format: parsed.format, sizeBytes: parsed.byteLength, recordCount: parsed.records.length, contentHash: "sha256:pending" });
    const verification = await repository.createVerification({ datasetVersionId: version.id });
    const artifact = await runVerification({ datasetId: dataset.id, version: version.version, name: dataset.name, dataset: parsed, rawBytes: new TextEncoder().encode(source) });
    const updated = await repository.updateVerification(verification.id, { status: "completed", profile: artifact.profile, score: artifact.score, passport: artifact.passport, completedAt: new Date().toISOString() });

    expect(updated.status).toBe("completed");
    expect(updated.score?.score).toBe(artifact.score.score);
    expect(updated.passport?.passportHash).toBe(artifact.passport.passportHash);
    expect((await repository.findLatestVerification(version.id))?.profile?.recordCount).toBe(2);
  });
});
