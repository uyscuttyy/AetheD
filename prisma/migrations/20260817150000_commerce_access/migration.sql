CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL,
  "datasetVersionId" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "contractAddress" TEXT NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "blockNumber" BIGINT NOT NULL,
  "versionKey" TEXT NOT NULL,
  "buyerAddress" TEXT NOT NULL,
  "sellerAddress" TEXT NOT NULL,
  "priceWei" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessGrant" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "datasetVersionId" TEXT NOT NULL,
  "buyerAddress" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Purchase_transactionHash_key" ON "Purchase"("transactionHash");
CREATE INDEX "Purchase_datasetVersionId_buyerAddress_idx" ON "Purchase"("datasetVersionId", "buyerAddress");
CREATE INDEX "Purchase_versionKey_buyerAddress_idx" ON "Purchase"("versionKey", "buyerAddress");
CREATE UNIQUE INDEX "AccessGrant_purchaseId_key" ON "AccessGrant"("purchaseId");
CREATE UNIQUE INDEX "AccessGrant_datasetVersionId_buyerAddress_key" ON "AccessGrant"("datasetVersionId", "buyerAddress");
CREATE INDEX "AccessGrant_buyerAddress_createdAt_idx" ON "AccessGrant"("buyerAddress", "createdAt");
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
