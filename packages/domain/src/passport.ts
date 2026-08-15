import { createHash } from "node:crypto";
import { AetheScoreResult } from "./scoring.js";
import { ParsedDataset, DatasetFormat } from "./dataset.js";
import { VerificationProfile } from "./verification.js";

export type PassportInput = {
  datasetId: string;
  version: string;
  name: string;
  sellerAddress?: string;
  dataset: ParsedDataset;
  profile: VerificationProfile;
  score: AetheScoreResult;
  storage?: { provider: string; reference: string };
  verificationArtifact?: { provider: string; reference: string };
  generatedAt?: Date;
};

export type DataPassport = {
  passportVersion: "1.0.0";
  datasetId: string;
  version: string;
  name: string;
  sellerAddress?: string;
  aetheScore: number;
  confidence: number;
  records: number;
  format: DatasetFormat;
  sizeBytes: number;
  datasetHash: string;
  storage?: { provider: string; reference: string };
  verificationArtifact?: { provider: string; reference: string };
  dimensions: AetheScoreResult["components"];
  limitations: string[];
  generatedAt: string;
  passportHash: string;
};

export function createDataPassport(input: PassportInput): DataPassport {
  const payload: Omit<DataPassport, "passportHash"> = {
    passportVersion: "1.0.0", datasetId: input.datasetId, version: input.version, name: input.name,
    ...(input.sellerAddress ? { sellerAddress: input.sellerAddress } : {}),
    aetheScore: input.score.score, confidence: input.score.confidence, records: input.profile.recordCount,
    format: input.dataset.format, sizeBytes: input.dataset.byteLength, datasetHash: input.profile.contentHash,
    ...(input.storage ? { storage: input.storage } : {}),
    ...(input.verificationArtifact ? { verificationArtifact: input.verificationArtifact } : {}),
    dimensions: input.score.components, limitations: input.score.limitations,
    generatedAt: (input.generatedAt ?? new Date()).toISOString()
  };
  const passportHash = `sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
  return { ...payload, passportHash };
}
