import { createHash } from "node:crypto";
import { DatasetRecord, ParsedDataset } from "./dataset.js";

export type DimensionName = "quality" | "cleanliness" | "uniqueness" | "freshness" | "consistency" | "provenance" | "aiUtility";
export type EvidenceKind = "measured" | "inferred" | "sellerProvided" | "unknown";

export type DimensionResult = {
  score?: number;
  confidence: number;
  evidenceKind: EvidenceKind;
  signals: Record<string, number | string | boolean>;
  limitations: string[];
};

export type VerificationInput = {
  dataset: ParsedDataset;
  rawBytes: Uint8Array;
  collectedAt?: Date;
  verifiedProvenanceEvidence?: string[];
};

export type VerificationProfile = {
  recordCount: number;
  columnCount: number;
  missingCellRate: number;
  duplicateRate: number;
  schemaConsistencyRate: number;
  typeConsistencyRate: number;
  contentHash: string;
  dimensions: Record<DimensionName, DimensionResult>;
};

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const isMissing = (value: unknown): boolean => value === null || value === undefined || (typeof value === "string" && value.trim() === "");
const valueType = (value: unknown): string => value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
const stableRecord = (record: DatasetRecord): string => JSON.stringify(Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b))));

export function profileDataset(input: VerificationInput): VerificationProfile {
  const { dataset } = input;
  const recordCount = dataset.records.length;
  const columnCount = dataset.columns.length;
  const totalCells = recordCount * columnCount;
  const missingCells = dataset.records.reduce((total, record) => total + dataset.columns.filter((column) => isMissing(record[column])).length, 0);
  const missingCellRate = totalCells === 0 ? 1 : missingCells / totalCells;
  const uniqueRecords = new Set(dataset.records.map(stableRecord)).size;
  const duplicateRate = recordCount === 0 ? 0 : (recordCount - uniqueRecords) / recordCount;
  const completeSchemas = dataset.records.filter((record) => dataset.columns.every((column) => Object.hasOwn(record, column))).length;
  const schemaConsistencyRate = recordCount === 0 ? 0 : completeSchemas / recordCount;
  let consistentCells = 0;
  let typedCells = 0;
  for (const column of dataset.columns) {
    const types = dataset.records.map((record) => record[column]).filter((value) => !isMissing(value)).map(valueType);
    const counts = new Map<string, number>();
    for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1);
    consistentCells += Math.max(0, ...counts.values());
    typedCells += types.length;
  }
  const typeConsistencyRate = typedCells === 0 ? 0 : consistentCells / typedCells;
  const contentHash = `sha256:${createHash("sha256").update(input.rawBytes).digest("hex")}`;
  const freshnessDays = input.collectedAt ? Math.max(0, (Date.now() - input.collectedAt.getTime()) / 86_400_000) : undefined;
  const provenanceEvidence = input.verifiedProvenanceEvidence ?? [];

  const dimensions: VerificationProfile["dimensions"] = {
    quality: {
      score: clamp(100 - missingCellRate * 100), confidence: 0.95, evidenceKind: "measured",
      signals: { missingCellRate, recordCount, columnCount }, limitations: []
    },
    cleanliness: {
      score: clamp(100 - missingCellRate * 55 - duplicateRate * 45), confidence: 0.9, evidenceKind: "measured",
      signals: { missingCellRate, duplicateRate }, limitations: ["Semantic noise and domain-specific invalid values are not yet measured"]
    },
    uniqueness: {
      score: clamp(100 - duplicateRate * 100), confidence: 0.98, evidenceKind: "measured",
      signals: { duplicateRate, uniqueRecords }, limitations: ["Near-duplicate detection is not included in this pipeline version"]
    },
    freshness: freshnessDays === undefined ? {
      confidence: 0, evidenceKind: "unknown", signals: {}, limitations: ["No collection or update timestamp was supplied"]
    } : {
      score: clamp(100 - Math.min(freshnessDays, 365) / 365 * 100), confidence: 0.7, evidenceKind: "sellerProvided",
      signals: { ageDays: Number(freshnessDays.toFixed(2)) }, limitations: ["Timestamp has not been independently verified"]
    },
    consistency: {
      score: clamp((schemaConsistencyRate * 0.55 + typeConsistencyRate * 0.45) * 100), confidence: 0.92, evidenceKind: "measured",
      signals: { schemaConsistencyRate, typeConsistencyRate }, limitations: []
    },
    provenance: provenanceEvidence.length === 0 ? {
      confidence: 0, evidenceKind: "unknown", signals: { evidenceCount: 0 }, limitations: ["No independently verified provenance evidence was supplied"]
    } : {
      score: clamp(60 + Math.min(provenanceEvidence.length, 4) * 10), confidence: 0.75, evidenceKind: "measured",
      signals: { evidenceCount: provenanceEvidence.length }, limitations: ["Evidence authenticity must be checked by its verification adapter"]
    },
    aiUtility: {
      score: clamp((schemaConsistencyRate * 0.4 + typeConsistencyRate * 0.3 + (1 - missingCellRate) * 0.3) * 100),
      confidence: 0.45, evidenceKind: "inferred",
      signals: { schemaConsistencyRate, typeConsistencyRate, completenessRate: 1 - missingCellRate },
      limitations: ["This is a structural suitability estimate, not a model-based evaluation", "Task-specific usefulness is not verified"]
    }
  };
  return { recordCount, columnCount, missingCellRate, duplicateRate, schemaConsistencyRate, typeConsistencyRate, contentHash, dimensions };
}
