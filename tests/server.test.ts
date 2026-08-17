import { describe, expect, it } from "vitest";
import { createApiServer } from "../apps/api/server.js";
import { InMemoryDatasetRepository, InMemoryVerificationQueue, LocalArtifactStore, VerificationApplicationService } from "../packages/domain/src/index.js";

describe("HTTP API adapter", () => {
  it("exposes health and dataset submission routes", async () => {
    const repository = new InMemoryDatasetRepository();
    const service = new VerificationApplicationService(repository, new InMemoryVerificationQueue(), new LocalArtifactStore("/tmp/aethed-test-artifacts"));
    const server = createApiServer({ repository, service, maxBodyBytes: 25 * 1024 * 1024, uploadRoot: "/tmp/aethed-test-uploads" }); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Server did not bind");
    const base = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${base}/health`)).status).toBe(200);
    const response = await fetch(`${base}/api/v1/datasets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sellerAddress: "api-test", name: "HTTP Dataset", description: "test", category: "research", version: "1.0", filename: "data.json", content: '[{"id":1}]' }) });
    expect(response.status).toBe(202); expect((await response.json()).data.verificationStatus).toBe("queued");
    const upload = new FormData();
    upload.set("sellerAddress", "api-test");
    upload.set("name", "Streamed Dataset");
    upload.set("version", "1.0");
    upload.set("file", new Blob(['[{"id":2}]'], { type: "application/json" }), "streamed.json");
    expect((await fetch(`${base}/api/v1/uploads`, { method: "POST", body: upload })).status).toBe(202);
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }, 15_000);
});
