import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { AetheDApi, InMemoryDatasetRepository, InMemoryVerificationQueue, LocalArtifactStore, VerificationApplicationService } from "../../packages/domain/src/index.js";

const port = Number(process.env.API_PORT ?? "4000");
const maxBodyBytes = 25 * 1024 * 1024;
const repository = new InMemoryDatasetRepository();
const service = new VerificationApplicationService(repository, new InMemoryVerificationQueue(), new LocalArtifactStore(process.env.AETHED_ARTIFACT_ROOT ?? "/tmp/aethed-artifacts"));
const api = new AetheDApi(repository, service);

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status; response.setHeader("content-type", "application/json"); response.end(JSON.stringify(body));
}

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += value.length; if (size > maxBodyBytes) throw new Error("Request body exceeds 25 MB"); chunks.push(value); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createApiServer() {
  return createServer(async (request, response) => {
    try {
      const path = request.url?.split("?")[0] ?? "/";
      if (request.method === "GET" && path === "/health") return send(response, 200, { data: { status: "ok" } });
      if (request.method === "POST" && path === "/api/v1/datasets") {
        const result = await api.submitDataset(await body(request) as never);
        if (result.status === 202) await api.processVerifications();
        return send(response, result.status, result.body);
      }
      const verification = path.match(/^\/api\/v1\/verifications\/([^/]+)$/);
      if (request.method === "GET" && verification) { const result = await api.getVerification(verification[1]!); return send(response, result.status, result.body); }
      return send(response, 404, { error: { code: "NOT_FOUND", message: "Route not found" } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      const status = message.includes("25 MB") ? 413 : message.includes("JSON") ? 400 : 500;
      return send(response, status, { error: { code: status === 413 ? "PAYLOAD_TOO_LARGE" : "REQUEST_FAILED", message } });
    }
  });
}

if (process.argv[1]?.endsWith("server.ts")) createApiServer().listen(port, "127.0.0.1", () => console.log(`AetheD API listening on http://127.0.0.1:${port}`));
