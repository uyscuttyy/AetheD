import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { AetheDApi, CommerceApplicationService, VerificationApplicationService, type DatasetRepository } from "../../packages/domain/src/index.js";
import { loadEnv } from "../../packages/config/src/env.js";
import { BullMqVerificationQueue, EvmAccessProofVerifier, FileVerificationInputStore, GalileoPurchaseReceiptVerifier, createRuntimeArtifactStore, createRuntimePersistence, createRuntimeRegistryPublisher, type RuntimePersistence } from "../../packages/infrastructure/src/index.js";
import { receiveDatasetUpload } from "./upload.js";

export type ApiServerOptions = {
  repository: DatasetRepository;
  service: VerificationApplicationService;
  maxBodyBytes: number;
  uploadRoot: string;
  commerceService?: CommerceApplicationService | undefined;
};

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status; response.setHeader("content-type", "application/json"); response.end(JSON.stringify(body));
}

function sendContent(response: ServerResponse, content: Uint8Array, contentHash: string) {
  response.statusCode = 200;
  response.setHeader("content-type", "application/octet-stream");
  response.setHeader("content-length", content.byteLength);
  response.setHeader("content-disposition", "attachment");
  response.setHeader("x-aethed-content-hash", contentHash);
  response.end(Buffer.from(content));
}

async function body(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += value.length; if (size > maxBodyBytes) throw new Error(`Request body exceeds ${maxBodyBytes} bytes`); chunks.push(value); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createApiServer(options: ApiServerOptions) {
  const api = new AetheDApi(options.repository, options.service, options.commerceService);
  return createServer(async (request, response) => {
    try {
      const path = request.url?.split("?")[0] ?? "/";
      if (request.method === "GET" && path === "/health") return send(response, 200, { data: { status: "ok" } });
      if (request.method === "GET" && path === "/api/v1/datasets") {
        const url = new URL(request.url ?? "/", "http://localhost");
        const q = url.searchParams.get("q"); const category = url.searchParams.get("category");
        const format = url.searchParams.get("format"); const minScore = url.searchParams.get("minScore");
        const result = await api.search({ ...(q ? { q } : {}), ...(category ? { category } : {}),
          ...(format ? { format } : {}), ...(minScore ? { minScore: Number(minScore) } : {}) });
        return send(response, result.status, result.body);
      }
      const datasetPath = path.match(/^\/api\/v1\/datasets\/([^/]+)$/);
      if (request.method === "GET" && datasetPath) {
        const result = await api.getDataset(datasetPath[1]!);
        return send(response, result.status, result.body);
      }
      if (request.method === "POST" && path === "/api/v1/datasets") {
        const result = await api.submitDataset(await body(request, options.maxBodyBytes) as never);
        return send(response, result.status, result.body);
      }
      if (request.method === "POST" && path === "/api/v1/uploads") {
        const result = await receiveDatasetUpload(request, {
          maxBytes: options.maxBodyBytes,
          uploadRoot: options.uploadRoot,
          service: options.service
        });
        return send(response, 202, { data: { ...result, verificationStatus: "queued" } });
      }
      if (request.method === "POST" && path === "/api/v1/purchases/reconcile") {
        const result = await api.reconcilePurchase(await body(request, options.maxBodyBytes) as { datasetVersionId: string; buyerAddress: string; transactionHash: string });
        return send(response, result.status, result.body);
      }
      const access = path.match(/^\/api\/v1\/versions\/([^/]+)\/access$/);
      if (request.method === "GET" && access) {
        const url = new URL(request.url ?? "/", "http://localhost");
        const result = await api.getAccess({
          datasetVersionId: access[1]!,
          buyerAddress: url.searchParams.get("buyerAddress") ?? "",
          timestamp: url.searchParams.get("timestamp") ?? "",
          signature: url.searchParams.get("signature") ?? ""
        });
        return send(response, result.status, result.body);
      }
      const content = path.match(/^\/api\/v1\/versions\/([^/]+)\/content$/);
      if (request.method === "GET" && content) {
        if (!options.commerceService) return send(response, 503, { error: { code: "COMMERCE_UNAVAILABLE", message: "Artifact delivery is not configured" } });
        const url = new URL(request.url ?? "/", "http://localhost");
        try {
          const delivered = await options.commerceService.getContent({
            datasetVersionId: content[1]!, buyerAddress: url.searchParams.get("buyerAddress") ?? "",
            timestamp: url.searchParams.get("timestamp") ?? "", signature: url.searchParams.get("signature") ?? ""
          });
          return sendContent(response, delivered.content, delivered.contentHash);
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Artifact delivery failed";
          return send(response, message.includes("not found") ? 404 : 403, { error: { code: "ACCESS_NOT_GRANTED", message } });
        }
      }
      const verification = path.match(/^\/api\/v1\/verifications\/([^/]+)$/);
      if (request.method === "GET" && verification) { const result = await api.getVerification(verification[1]!); return send(response, result.status, result.body); }
      return send(response, 404, { error: { code: "NOT_FOUND", message: "Route not found" } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      const status = message.includes("bytes") || message.includes("exceeds") ? 413
        : message.includes("supported") ? 422
        : message.includes("required") || message.includes("multipart") || message.includes("JSON") ? 400
        : 500;
      const code = status === 413 ? "PAYLOAD_TOO_LARGE" : status === 422 ? "UNSUPPORTED_FORMAT" : "REQUEST_FAILED";
      return send(response, status, { error: { code, message } });
    }
  });
}

export function createConfiguredApiServer(env = loadEnv()): { server: ReturnType<typeof createServer>; persistence: RuntimePersistence } {
  const persistence = createRuntimePersistence({ provider: env.persistenceProvider, databaseUrl: env.databaseUrl });
  const queue = new BullMqVerificationQueue(env.redisUrl);
  const artifactStore = createRuntimeArtifactStore({ provider: env.artifactStoreProvider, localRoot: env.artifactRoot, chainId: env.ogChainId, rpcUrl: env.ogChainRpcUrl, indexerUrl: env.ogStorageIndexerUrl, privateKey: env.privateKey });
  const service = new VerificationApplicationService(
    persistence.repository,
    queue,
    artifactStore,
    new FileVerificationInputStore(`${env.artifactRoot}/inputs`),
    createRuntimeRegistryPublisher({ chainId: env.ogChainId, rpcUrl: env.ogChainRpcUrl, contractAddress: env.ogContractAddress, privateKey: env.privateKey, defaultPriceWei: env.ogRegistryDefaultPriceWei })
  );
  const commerceService = env.ogContractAddress && env.ogChainId && env.ogChainRpcUrl
    ? new CommerceApplicationService(
        persistence.repository,
        persistence.commerceRepository,
        new GalileoPurchaseReceiptVerifier({ chainId: env.ogChainId, rpcUrl: env.ogChainRpcUrl, contractAddress: env.ogContractAddress }),
        new EvmAccessProofVerifier(), artifactStore
      )
    : undefined;
  return { server: createApiServer({
    repository: persistence.repository,
    service,
    maxBodyBytes: env.maxUploadBytes,
    uploadRoot: `${env.artifactRoot}/uploads`,
    commerceService
  }), persistence };
}

if (process.argv[1]?.endsWith("server.ts")) {
  const env = loadEnv();
  const configured = createConfiguredApiServer(env);
  const shutdown = async () => {
    configured.server.close(async () => {
      await configured.persistence.close();
      process.exit(0);
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  configured.server.listen(env.apiPort, env.apiHost, () => console.log(`AetheD API listening on http://${env.apiHost}:${env.apiPort} (${configured.persistence.provider})`));
}
