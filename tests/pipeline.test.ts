import { describe, expect, it } from "vitest";
import { createDataPassport, LocalArtifactStore, parseDataset, runVerification } from "../packages/domain/src/index.js";
import { mkdir, rm } from "node:fs/promises";

describe("verification pipeline and passport", () => {
  it("runs stages and produces a stable identity for a dataset version", async () => {
    const source = '[{"id":1,"text":"hello"}]';
    const rawBytes = new TextEncoder().encode(source);
    const dataset = parseDataset("demo.json", rawBytes);
    const artifact = await runVerification({ datasetId: "dataset_1", version: "1.0", name: "Demo", dataset, rawBytes });
    expect(artifact.status).toBe("completed");
    expect(artifact.passport.datasetId).toBe("dataset_1");
    expect(artifact.passport.version).toBe("1.0");
    expect(artifact.passport.passportHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("supports replaceable stages", async () => {
    const source = '[{"id":1}]';
    const rawBytes = new TextEncoder().encode(source);
    const dataset = parseDataset("demo.json", rawBytes);
    const artifact = await runVerification(
      { datasetId: "dataset_1", version: "1.0", name: "Demo", dataset, rawBytes },
      [{ name: "marker", run: async (_context, state) => ({ ...state }) }]
    );
    expect(artifact.pipelineVersion).toBe("1.0.0");
  });

  it("keeps local artifacts inside the configured root", async () => {
    const root = "/tmp/aethed-artifacts-test";
    await rm(root, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    const store = new LocalArtifactStore(root);
    const reference = await store.put("verification/demo.json", new TextEncoder().encode("{}"));
    expect(new TextDecoder().decode(await store.get(reference.reference))).toBe("{}");
    await expect(store.get("../outside")).rejects.toThrow("Invalid artifact reference");
    await rm(root, { recursive: true, force: true });
  });
});
