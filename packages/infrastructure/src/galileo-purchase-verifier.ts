import { Interface, JsonRpcProvider, getAddress, isHexString } from "ethers";
import type { ConfirmedPurchase, PurchaseReceiptVerifier } from "../../domain/src/index.js";

const purchaseInterface = new Interface([
  "event DatasetVersionPurchased(bytes32 indexed versionKey, address indexed buyer, address indexed seller, uint256 price)"
]);

export class GalileoPurchaseReceiptVerifier implements PurchaseReceiptVerifier {
  private readonly provider: JsonRpcProvider;

  constructor(private readonly config: { chainId: number; rpcUrl: string; contractAddress: string }) {
    if (config.chainId !== 16602) throw new Error("Purchase verification requires Galileo chain ID 16602");
    this.provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
  }

  async verify(transactionHash: string): Promise<ConfirmedPurchase> {
    if (!isHexString(transactionHash, 32)) throw new Error("Invalid purchase transaction hash");
    const receipt = await this.provider.getTransactionReceipt(transactionHash);
    if (!receipt) throw new Error("Purchase transaction is not confirmed");
    if (receipt.status !== 1) throw new Error("Purchase transaction failed");
    const log = receipt.logs.find(candidate => candidate.address.toLowerCase() === this.config.contractAddress.toLowerCase() && candidate.topics[0] === purchaseInterface.getEvent("DatasetVersionPurchased")!.topicHash);
    if (!log) throw new Error("Purchase event not found in transaction receipt");
    const parsed = purchaseInterface.parseLog(log);
    if (!parsed) throw new Error("Purchase event could not be decoded");
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== this.config.chainId) throw new Error("Purchase receipt is from an unexpected chain");
    return {
      chainId: this.config.chainId,
      contractAddress: getAddress(this.config.contractAddress),
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      versionKey: parsed.args.versionKey,
      buyerAddress: getAddress(parsed.args.buyer),
      sellerAddress: getAddress(parsed.args.seller),
      priceWei: parsed.args.price.toString()
    };
  }
}
