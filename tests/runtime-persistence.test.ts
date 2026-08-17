import { describe, expect, it } from "vitest";
import { createRuntimePersistence } from "../packages/infrastructure/src/index.js";

describe("runtime persistence selection", () => {
  it("uses memory when no database URL is configured", async () => {
    const runtime = createRuntimePersistence({ provider: "memory" });
    expect(runtime.provider).toBe("memory");
    await runtime.close();
  });

  it("selects PostgreSQL when a database URL is configured", async () => {
    const runtime = createRuntimePersistence({ provider: "postgresql", databaseUrl: "postgresql://example.invalid/aethed" });
    expect(runtime.provider).toBe("postgresql");
    await runtime.close();
  });
});
