import { createHash } from "node:crypto";
import { Contract, JsonRpcProvider } from "ethers";
import { GalileoRegistryPublisher, ZeroGStorageArtifactStore } from "../packages/infrastructure/src/index.js";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const sha256 = (bytes: Uint8Array): string => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function main() {
  const chainId = Number(required("OG_CHAIN_ID"));
  const rpcUrl = required("OG_RPC_URL");
  const contractAddress = required("OG_CONTRACT_ADDRESS");
  const privateKey = required("PRIVATE_KEY");
  const indexerUrl = required("OG_STORAGE_INDEXER_URL");
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const datasetId = `aethed-galileo-smoke-${runId}`;
  const versionId = `version-${runId}`;
  const content = new TextEncoder().encode(JSON.stringify([
    { id: 1, source: "AetheD Galileo smoke", verifiedAt: new Date().toISOString() }
  ]));

  const storage = new ZeroGStorageArtifactStore({ chainId, rpcUrl, indexerUrl, privateKey });
  const uploaded = await storage.put(`integration/${datasetId}.json`, content);
  const retrieved = await storage.get(uploaded.reference);
  if (!Buffer.from(retrieved).equals(Buffer.from(content))) throw new Error("Retrieved 0G bytes do not match uploaded bytes");

  const publisher = new GalileoRegistryPublisher({ chainId, rpcUrl, contractAddress, privateKey, defaultPriceWei: 0n });
  const passport = new TextEncoder().encode(JSON.stringify({ datasetId, versionId, storageRoot: uploaded.reference }));
  const publication = await publisher.publish({
    datasetId,
    versionId,
    sellerAddress: publisher.sellerAddress,
    datasetHash: sha256(content),
    passportHash: sha256(passport),
    storageRoot: uploaded.reference
  });

  const reader = new Contract(contractAddress, [
    "function getVersion(bytes32 versionKey) view returns ((address seller, bytes32 datasetHash, bytes32 passportHash, bytes32 storageRoot, uint256 price, bool active))"
  ], new JsonRpcProvider(rpcUrl, chainId));
  const registered = await reader.getFunction("getVersion")(publication.versionKey);

  console.log(JSON.stringify({
    completedAt: new Date().toISOString(),
    chainId,
    contractAddress: publication.contractAddress,
    sellerAddress: publisher.sellerAddress,
    datasetId,
    versionId,
    storage: {
      rootHash: uploaded.reference,
      transactionHash: uploaded.transactionHash,
      bytesVerified: retrieved.byteLength
    },
    registry: publication,
    readBack: {
      seller: registered.seller,
      datasetHash: registered.datasetHash,
      passportHash: registered.passportHash,
      storageRoot: registered.storageRoot,
      price: registered.price.toString(),
      active: registered.active
    }
  }, null, 2));
}

void main();
