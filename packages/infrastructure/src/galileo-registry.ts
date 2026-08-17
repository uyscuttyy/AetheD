import { Contract, JsonRpcProvider, Wallet, getAddress, id, isAddress, zeroPadValue } from "ethers";
import type { DatasetRegistryPublisher, RegistryPublication, RegistryPublicationInput } from "../../domain/src/index.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ABI = [
  "function datasetSellers(bytes32 datasetId) view returns (address)",
  "function getVersion(bytes32 versionKey) view returns ((address seller, bytes32 datasetHash, bytes32 passportHash, bytes32 storageRoot, uint256 price, bool active))",
  "function getVersionKey(bytes32 datasetId, bytes32 versionId) pure returns (bytes32)",
  "function registerDataset(bytes32 datasetId)",
  "function registerVersion(bytes32 datasetId, bytes32 versionId, bytes32 datasetHash, bytes32 passportHash, bytes32 storageRoot, uint256 price) returns (bytes32)"
] as const;

const integrityHash = (value: string, label: string): string => {
  const match = value.match(/^(?:sha256:)?(?:0x)?([0-9a-fA-F]{64})$/);
  if (!match) throw new Error(`${label} must be a 32-byte hash`);
  return zeroPadValue(`0x${match[1]}`, 32);
};

export class GalileoRegistryPublisher implements DatasetRegistryPublisher {
  readonly sellerAddress: string;
  private readonly contract: Contract;

  constructor(private readonly config: {
    chainId: number;
    rpcUrl: string;
    contractAddress: string;
    privateKey: string;
    defaultPriceWei: bigint;
  }) {
    if (config.chainId !== 16602) throw new Error("AetheD registry requires Galileo chain ID 16602");
    if (!isAddress(config.contractAddress) || getAddress(config.contractAddress) === ZERO_ADDRESS) throw new Error("Invalid AetheD registry address");
    const signer = new Wallet(config.privateKey, new JsonRpcProvider(config.rpcUrl, config.chainId));
    this.sellerAddress = signer.address;
    this.contract = new Contract(config.contractAddress, ABI, signer);
  }

  async publish(input: RegistryPublicationInput): Promise<RegistryPublication> {
    if (getAddress(input.sellerAddress) !== getAddress(this.sellerAddress)) throw new Error("Registry seller does not match the configured signer");
    const datasetKey = id(input.datasetId);
    const versionId = id(input.versionId);
    const getVersionKey = this.contract.getFunction("getVersionKey");
    const datasetSellers = this.contract.getFunction("datasetSellers");
    const registerDataset = this.contract.getFunction("registerDataset");
    const getVersion = this.contract.getFunction("getVersion");
    const registerVersion = this.contract.getFunction("registerVersion");
    const versionKey = await getVersionKey(datasetKey, versionId) as string;
    let datasetTransactionHash: string | undefined;
    let versionTransactionHash: string | undefined;

    const registeredSeller = getAddress(await datasetSellers(datasetKey) as string);
    if (registeredSeller === ZERO_ADDRESS) {
      const transaction = await registerDataset(datasetKey);
      datasetTransactionHash = transaction.hash;
      await transaction.wait();
    } else if (registeredSeller !== getAddress(this.sellerAddress)) {
      throw new Error(`Dataset is already registered to ${registeredSeller}`);
    }

    let versionExists = false;
    try {
      await getVersion(versionKey);
      versionExists = true;
    } catch {
      versionExists = false;
    }
    if (!versionExists) {
      const transaction = await registerVersion(
        datasetKey,
        versionId,
        integrityHash(input.datasetHash, "Dataset hash"),
        integrityHash(input.passportHash, "Passport hash"),
        integrityHash(input.storageRoot, "0G Storage root"),
        this.config.defaultPriceWei
      );
      versionTransactionHash = transaction.hash;
      await transaction.wait();
    }

    return {
      chainId: this.config.chainId,
      contractAddress: getAddress(this.config.contractAddress),
      datasetKey,
      versionKey,
      ...(datasetTransactionHash ? { datasetTransactionHash } : {}),
      ...(versionTransactionHash ? { versionTransactionHash } : {})
    };
  }
}
