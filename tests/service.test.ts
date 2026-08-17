import { rm } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  InMemoryDatasetRepository, InMemoryVerificationQueue, LocalArtifactStore,
  parseDataset, VerificationApplicationService, type DatasetRegistryPublisher
} from "../packages/domain/src/index.js";

describe("VerificationApplicationService", () => {
  it("moves a submitted dataset from queued verification to published", async () => {
    const root = "/tmp/aethed-service-test";
    await rm(root, { recursive: true, force: true });
    const repository = new InMemoryDatasetRepository();
    const service = new VerificationApplicationService(
      repository, new InMemoryVerificationQueue(), new LocalArtifactStore(root)
    );
    const rawBytes = new TextEncoder().encode('[{"id":1,"text":"hello"}]');
    const dataset = parseDataset("demo.json", rawBytes);
    const ids = await service.submit({
      sellerAddress: "0x123", name: "Demo", description: "Synthetic demo",
      category: "research", version: "1.0", dataset, rawBytes
    });
    expect((await repository.getVerification(ids.verificationId))?.status).toBe("queued");
    await service.processPending();
    expect((await repository.getVerification(ids.verificationId))?.status).toBe("completed");
    expect((await repository.getDataset(ids.datasetId))?.status).toBe("published");
    expect((await repository.getVersion(ids.versionId))?.contentHash).toMatch(/^sha256:/);
    await rm(root, { recursive: true, force: true });
  });

  it("records registry publication before marking a dataset published", async () => {
    const root = "/tmp/aethed-service-registry-test";
    await rm(root, { recursive: true, force: true });
    const repository = new InMemoryDatasetRepository();
    const publisher: DatasetRegistryPublisher = {
      sellerAddress: "0x0000000000000000000000000000000000000123",
      publish: async input => ({
        chainId: 16602,
        contractAddress: "0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c",
        datasetKey: `chain:${input.datasetId}`,
        versionKey: `chain:${input.versionId}`,
        datasetTransactionHash: "0xdataset",
        versionTransactionHash: "0xversion"
      })
    };
    const service = new VerificationApplicationService(
      repository, new InMemoryVerificationQueue(), new LocalArtifactStore(root), undefined, publisher
    );
    const rawBytes = new TextEncoder().encode('[{"id":1}]');
    const ids = await service.submit({
      sellerAddress: publisher.sellerAddress, name: "On-chain", description: "test",
      category: "research", version: "1.0", dataset: parseDataset("data.json", rawBytes), rawBytes
    });

    await service.processPending();

    expect((await repository.getVerification(ids.verificationId))?.registryPublication).toMatchObject({
      chainId: 16602,
      versionTransactionHash: "0xversion"
    });
    expect((await repository.getDataset(ids.datasetId))?.status).toBe("published");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects a seller that does not match the configured registry signer", async () => {
    const publisher: DatasetRegistryPublisher = {
      sellerAddress: "0x0000000000000000000000000000000000000123",
      publish: async () => { throw new Error("not reached"); }
    };
    const service = new VerificationApplicationService(
      new InMemoryDatasetRepository(), new InMemoryVerificationQueue(), new LocalArtifactStore("/tmp/aethed-service-seller-test"), undefined, publisher
    );
    const rawBytes = new TextEncoder().encode('[{"id":1}]');
    await expect(service.submit({
      sellerAddress: "0x0000000000000000000000000000000000000456", name: "Wrong seller", description: "test",
      category: "research", version: "1.0", dataset: parseDataset("data.json", rawBytes), rawBytes
    })).rejects.toThrow("Chain-enabled submissions must use the configured seller address");
  });
});
