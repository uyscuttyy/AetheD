import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDataset } from "../packages/domain/src/index.js";
import { BullMqVerificationQueue, FileVerificationInputStore } from "../packages/infrastructure/src/index.js";

describe("durable verification infrastructure", () => {
  it("reloads verification input after store recreation", async () => {
    const root = await mkdtemp(join(tmpdir(), "aethed-input-"));
    const bytes = new TextEncoder().encode('[{"value":1}]');
    const input = {
      sellerAddress: "0xseller",
      name: "Restart-safe input",
      description: "test",
      category: "test",
      version: "1.0.0",
      dataset: parseDataset("input.json", bytes),
      rawBytes: bytes
    };
    await new FileVerificationInputStore(root).put("verification_1", input);
    const restored = await new FileVerificationInputStore(root).get("verification_1");
    expect(restored?.name).toBe(input.name);
    expect(restored?.dataset.records).toEqual(input.dataset.records);
    expect(Buffer.from(restored?.rawBytes ?? []).equals(Buffer.from(bytes))).toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it.skipIf(!process.env.REDIS_URL)("recovers a queued Redis job with a new consumer", async () => {
    const name = `aethed-test-${Date.now()}`;
    const producer = new BullMqVerificationQueue(process.env.REDIS_URL!, name);
    await producer.enqueue({ verificationId: "verification_redis", datasetVersionId: "version_redis" });
    await producer.close();

    const consumer = new BullMqVerificationQueue(process.env.REDIS_URL!, name);
    const received: string[] = [];
    await consumer.consume(async job => { received.push(job.verificationId); });
    expect(received).toEqual(["verification_redis"]);
    await consumer.close();
  });
});
