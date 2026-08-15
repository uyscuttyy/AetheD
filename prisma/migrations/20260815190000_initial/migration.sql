-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('DRAFT', 'VERIFYING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('MEASURED', 'INFERRED', 'SELLER_PROVIDED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "DatasetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetVersion" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'QUEUED',
    "pipelineVersion" TEXT NOT NULL,
    "totalScore" INTEGER,
    "confidence" DOUBLE PRECISION,
    "profile" JSONB,
    "score" JSONB,
    "limitations" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDimension" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidenceKind" "EvidenceKind" NOT NULL,
    "signals" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,

    CONSTRAINT "VerificationDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataPassport" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "passportVersion" TEXT NOT NULL,
    "passportHash" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "DataPassport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactReference" (
    "id" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "Dataset_status_category_idx" ON "Dataset"("status", "category");

-- CreateIndex
CREATE INDEX "DatasetVersion_datasetId_createdAt_idx" ON "DatasetVersion"("datasetId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetVersion_datasetId_version_key" ON "DatasetVersion"("datasetId", "version");

-- CreateIndex
CREATE INDEX "Verification_datasetVersionId_createdAt_idx" ON "Verification"("datasetVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "Verification_status_idx" ON "Verification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationDimension_verificationId_name_key" ON "VerificationDimension"("verificationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DataPassport_verificationId_key" ON "DataPassport"("verificationId");

-- CreateIndex
CREATE UNIQUE INDEX "DataPassport_passportHash_key" ON "DataPassport"("passportHash");

-- CreateIndex
CREATE INDEX "ArtifactReference_datasetVersionId_kind_idx" ON "ArtifactReference"("datasetVersionId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ArtifactReference_provider_reference_key" ON "ArtifactReference"("provider", "reference");

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetVersion" ADD CONSTRAINT "DatasetVersion_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDimension" ADD CONSTRAINT "VerificationDimension_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPassport" ADD CONSTRAINT "DataPassport_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactReference" ADD CONSTRAINT "ArtifactReference_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
