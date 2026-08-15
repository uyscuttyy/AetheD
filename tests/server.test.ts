import { describe, expect, it } from "vitest";
import { createApiServer } from "../apps/api/server.js";

describe("HTTP API adapter", () => {
  it("exposes health and dataset submission routes", async () => {
    const server = createApiServer(); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Server did not bind");
    const base = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${base}/health`)).status).toBe(200);
    const response = await fetch(`${base}/api/v1/datasets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sellerAddress: "api-test", name: "HTTP Dataset", description: "test", category: "research", version: "1.0", filename: "data.json", content: '[{"id":1}]' }) });
    expect(response.status).toBe(202); expect((await response.json()).data.verificationStatus).toBe("queued");
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
});
