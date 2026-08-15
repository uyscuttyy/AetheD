import { describe, expect, it } from "vitest";
import { loadEnv } from "../packages/config/src/env.js";

describe("loadEnv", () => {
  it("loads required local configuration", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgres://localhost/aethed",
      REDIS_URL: "redis://localhost:6379",
      API_PORT: "4100"
    });

    expect(env.apiPort).toBe(4100);
    expect(env.nodeEnv).toBe("test");
  });

  it("rejects missing required configuration", () => {
    expect(() => loadEnv({ NODE_ENV: "test" })).toThrow(
      "DATABASE_URL and REDIS_URL are required"
    );
  });
});
