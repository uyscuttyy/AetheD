import type { ArtifactReference } from "./artifact.js";
import type { DatasetRepository } from "./repository.js";

export type ConfirmedPurchase = {
  chainId: number;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  versionKey: string;
  buyerAddress: string;
  sellerAddress: string;
  priceWei: string;
};

export type PurchaseRecord = ConfirmedPurchase & {
  id: string;
  datasetVersionId: string;
  createdAt: string;
};

export type AccessGrantRecord = {
  id: string;
  purchaseId: string;
  datasetVersionId: string;
  buyerAddress: string;
  createdAt: string;
};

export interface PurchaseReceiptVerifier {
  verify(transactionHash: string): Promise<ConfirmedPurchase>;
}

export interface AccessProofVerifier {
  verify(input: { datasetVersionId: string; buyerAddress: string; timestamp: string; signature: string }): Promise<void>;
}

export interface CommerceRepository {
  recordPurchase(input: Omit<PurchaseRecord, "id" | "createdAt">): Promise<PurchaseRecord>;
  grantAccess(input: Omit<AccessGrantRecord, "id" | "createdAt">): Promise<AccessGrantRecord>;
  findAccessGrant(datasetVersionId: string, buyerAddress: string): Promise<AccessGrantRecord | undefined>;
}

export class InMemoryCommerceRepository implements CommerceRepository {
  private readonly purchases = new Map<string, PurchaseRecord>();
  private readonly grants = new Map<string, AccessGrantRecord>();

  async recordPurchase(input: Omit<PurchaseRecord, "id" | "createdAt">): Promise<PurchaseRecord> {
    const existing = this.purchases.get(input.transactionHash.toLowerCase());
    if (existing) return existing;
    const value = { ...input, id: `purchase_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    this.purchases.set(input.transactionHash.toLowerCase(), value);
    return value;
  }

  async grantAccess(input: Omit<AccessGrantRecord, "id" | "createdAt">): Promise<AccessGrantRecord> {
    const key = `${input.datasetVersionId}:${input.buyerAddress.toLowerCase()}`;
    const existing = this.grants.get(key);
    if (existing) return existing;
    const value = { ...input, id: `grant_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    this.grants.set(key, value);
    return value;
  }

  async findAccessGrant(datasetVersionId: string, buyerAddress: string): Promise<AccessGrantRecord | undefined> {
    return this.grants.get(`${datasetVersionId}:${buyerAddress.toLowerCase()}`);
  }
}

export class CommerceApplicationService {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly commerce: CommerceRepository,
    private readonly verifier: PurchaseReceiptVerifier,
    private readonly accessProofVerifier?: AccessProofVerifier
  ) {}

  async reconcile(input: { datasetVersionId: string; buyerAddress: string; transactionHash: string }): Promise<{ purchase: PurchaseRecord; accessGrant: AccessGrantRecord }> {
    const version = await this.datasets.getVersion(input.datasetVersionId);
    if (!version) throw new Error("Dataset version not found");
    const verification = await this.datasets.findLatestVerification(version.id);
    const publication = verification?.registryPublication;
    if (!publication) throw new Error("Dataset version is not registered on-chain");
    const confirmed = await this.verifier.verify(input.transactionHash);
    if (confirmed.versionKey.toLowerCase() !== publication.versionKey.toLowerCase()) throw new Error("Purchase is for a different dataset version");
    if (confirmed.buyerAddress.toLowerCase() !== input.buyerAddress.toLowerCase()) throw new Error("Purchase buyer does not match the requested wallet");
    if (confirmed.contractAddress.toLowerCase() !== publication.contractAddress.toLowerCase()) throw new Error("Purchase was emitted by an unexpected contract");
    const purchase = await this.commerce.recordPurchase({ ...confirmed, datasetVersionId: version.id });
    const accessGrant = await this.commerce.grantAccess({ purchaseId: purchase.id, datasetVersionId: version.id, buyerAddress: confirmed.buyerAddress });
    return { purchase, accessGrant };
  }

  async getAccess(input: { datasetVersionId: string; buyerAddress: string; timestamp: string; signature: string }): Promise<{ grant: AccessGrantRecord; artifact: ArtifactReference }> {
    if (!this.accessProofVerifier) throw new Error("Wallet access proof is not configured");
    await this.accessProofVerifier.verify(input);
    const grant = await this.commerce.findAccessGrant(input.datasetVersionId, input.buyerAddress);
    if (!grant) throw new Error("Access grant not found");
    const verification = await this.datasets.findLatestVerification(input.datasetVersionId);
    const storage = verification?.passport?.storage;
    if (!storage) throw new Error("Dataset artifact is unavailable");
    return { grant, artifact: { provider: storage.provider as "local" | "0g", reference: storage.reference, contentHash: verification.passport!.datasetHash } };
  }
}
