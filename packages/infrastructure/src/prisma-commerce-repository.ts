import type { PrismaClient } from "@prisma/client";
import type { AccessGrantRecord, CommerceRepository, PurchaseRecord } from "../../domain/src/index.js";

const mapPurchase = (row: Awaited<ReturnType<PrismaClient["purchase"]["findUniqueOrThrow"]>>): PurchaseRecord => ({
  id: row.id,
  datasetVersionId: row.datasetVersionId,
  chainId: row.chainId,
  contractAddress: row.contractAddress,
  transactionHash: row.transactionHash,
  blockNumber: Number(row.blockNumber),
  versionKey: row.versionKey,
  buyerAddress: row.buyerAddress,
  sellerAddress: row.sellerAddress,
  priceWei: row.priceWei,
  createdAt: row.createdAt.toISOString()
});

const mapGrant = (row: Awaited<ReturnType<PrismaClient["accessGrant"]["findUniqueOrThrow"]>>): AccessGrantRecord => ({
  id: row.id,
  purchaseId: row.purchaseId,
  datasetVersionId: row.datasetVersionId,
  buyerAddress: row.buyerAddress,
  createdAt: row.createdAt.toISOString()
});

export class PrismaCommerceRepository implements CommerceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async recordPurchase(input: Omit<PurchaseRecord, "id" | "createdAt">): Promise<PurchaseRecord> {
    return mapPurchase(await this.prisma.purchase.upsert({
      where: { transactionHash: input.transactionHash.toLowerCase() },
      create: { ...input, transactionHash: input.transactionHash.toLowerCase(), buyerAddress: input.buyerAddress.toLowerCase(), sellerAddress: input.sellerAddress.toLowerCase(), contractAddress: input.contractAddress.toLowerCase(), blockNumber: BigInt(input.blockNumber) },
      update: {}
    }));
  }

  async grantAccess(input: Omit<AccessGrantRecord, "id" | "createdAt">): Promise<AccessGrantRecord> {
    return mapGrant(await this.prisma.accessGrant.upsert({
      where: { datasetVersionId_buyerAddress: { datasetVersionId: input.datasetVersionId, buyerAddress: input.buyerAddress.toLowerCase() } },
      create: { ...input, buyerAddress: input.buyerAddress.toLowerCase() },
      update: {}
    }));
  }

  async findAccessGrant(datasetVersionId: string, buyerAddress: string): Promise<AccessGrantRecord | undefined> {
    const row = await this.prisma.accessGrant.findUnique({ where: { datasetVersionId_buyerAddress: { datasetVersionId, buyerAddress: buyerAddress.toLowerCase() } } });
    return row ? mapGrant(row) : undefined;
  }
}
