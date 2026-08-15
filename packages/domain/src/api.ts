import { DatasetRepository } from "./repository.js";
import { parseDataset } from "./parser.js";
import { DatasetParseError } from "./dataset.js";
import { VerificationApplicationService } from "./service.js";

export type ApiResponse<T> = { status: number; body: T };
export type ApiError = { error: { code: string; message: string; details?: Record<string, unknown> } };

export type SubmitDatasetRequest = {
  sellerAddress: string;
  name: string;
  description: string;
  category: string;
  version: string;
  filename: string;
  content: string;
};

export type SearchQuery = {
  q?: string;
  category?: string;
  minScore?: number;
  format?: string;
  limit?: number;
};

const error = (status: number, code: string, message: string): ApiResponse<ApiError> => ({ status, body: { error: { code, message } } });

export class AetheDApi {
  constructor(
    private readonly repository: DatasetRepository,
    private readonly verificationService: VerificationApplicationService
  ) {}

  async submitDataset(input: SubmitDatasetRequest): Promise<ApiResponse<unknown>> {
    if (!input.sellerAddress || !input.name || !input.version || !input.filename || !input.content) {
      return error(400, "INVALID_REQUEST", "sellerAddress, name, version, filename, and content are required");
    }
    try {
      const rawBytes = new TextEncoder().encode(input.content);
      const dataset = parseDataset(input.filename, rawBytes);
      const result = await this.verificationService.submit({
        sellerAddress: input.sellerAddress, name: input.name, description: input.description,
        category: input.category, version: input.version, dataset, rawBytes
      });
      return { status: 202, body: { data: { ...result, verificationStatus: "queued" } } };
    } catch (caught) {
      if (caught instanceof DatasetParseError) return error(422, caught.code, caught.message);
      return error(500, "INTERNAL_ERROR", "Dataset submission failed");
    }
  }

  async processVerifications(): Promise<ApiResponse<unknown>> {
    await this.verificationService.processPending();
    return { status: 200, body: { data: { processed: true } } };
  }

  async getVerification(id: string): Promise<ApiResponse<unknown>> {
    const verification = await this.repository.getVerification(id);
    if (!verification) return error(404, "VERIFICATION_NOT_FOUND", "Verification not found");
    return { status: 200, body: { data: verification } };
  }

  async getDataset(id: string): Promise<ApiResponse<unknown>> {
    const dataset = await this.repository.getDataset(id);
    if (!dataset) return error(404, "DATASET_NOT_FOUND", "Dataset not found");
    const versions = await this.repository.listVersions(id);
    const enrichedVersions = await Promise.all(versions.map(async (version) => ({
      ...version, verification: await this.repository.findLatestVerification(version.id)
    })));
    return { status: 200, body: { data: { ...dataset, versions: enrichedVersions } } };
  }

  async search(query: SearchQuery): Promise<ApiResponse<unknown>> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const needle = query.q?.trim().toLowerCase();
    const datasets = await this.repository.listDatasets();
    const results = [];
    for (const dataset of datasets) {
      if (dataset.status !== "published") continue;
      if (query.category && dataset.category !== query.category) continue;
      if (needle && !`${dataset.name} ${dataset.description} ${dataset.category}`.toLowerCase().includes(needle)) continue;
      const versions = await this.repository.listVersions(dataset.id);
      const version = versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (!version || (query.format && version.format !== query.format)) continue;
      const verification = await this.repository.findLatestVerification(version.id);
      const score = verification?.score?.score;
      if (query.minScore !== undefined && (score === undefined || score < query.minScore)) continue;
      results.push({ id: dataset.id, name: dataset.name, category: dataset.category, version: version.version,
        format: version.format, recordCount: version.recordCount, aetheScore: score,
        confidence: verification?.score?.confidence, verified: verification?.status === "completed" });
      if (results.length >= limit) break;
    }
    return { status: 200, body: { data: results, meta: { count: results.length } } };
  }
}
