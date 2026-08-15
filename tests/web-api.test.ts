import { describe, expect, it } from "vitest";
import { POST } from "../apps/web/app/api/v1/datasets/route.js";
import { GET } from "../apps/web/app/api/v1/verifications/[id]/route.js";

describe("Next.js local API adapter", () => {
  it("submits and returns a completed verification", async () => {
    const submitted = await POST(new Request("http://localhost/api/v1/datasets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sellerAddress: "local-test-seller",
        name: "Adapter Test Dataset",
        description: "Synthetic adapter test",
        category: "Research",
        version: "1.0",
        filename: "adapter-test.json",
        content: '[{"id":1,"label":"valid"}]'
      })
    }));
    expect(submitted.status).toBe(202);
    const submission = await submitted.json();
    const verification = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: submission.data.verificationId })
    });
    expect(verification.status).toBe(200);
    const result = await verification.json();
    expect(result.data.status).toBe("completed");
    expect(result.data.passport.passportHash).toMatch(/^sha256:/);
  });

  it("returns a stable invalid JSON error", async () => {
    const response = await POST(new Request("http://localhost/api/v1/datasets", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } });
  });
});
