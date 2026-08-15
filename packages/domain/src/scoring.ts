import { DimensionName, DimensionResult, VerificationProfile } from "./verification.js";

const WEIGHTS: Record<DimensionName, number> = {
  quality: 0.2, cleanliness: 0.15, uniqueness: 0.15, freshness: 0.1,
  consistency: 0.15, provenance: 0.15, aiUtility: 0.1
};

export type AetheScoreResult = {
  score: number;
  confidence: number;
  methodologyVersion: "1.0.0";
  components: Record<DimensionName, DimensionResult>;
  limitations: string[];
};

export function calculateAetheScore(profile: VerificationProfile): AetheScoreResult {
  const entries = Object.entries(profile.dimensions) as [DimensionName, DimensionResult][];
  const available = entries.filter(([, result]) => result.score !== undefined);
  const availableWeight = available.reduce((total, [name]) => total + WEIGHTS[name], 0);
  const weightedScore = available.reduce((total, [name, result]) => total + (result.score ?? 0) * WEIGHTS[name], 0) / Math.max(availableWeight, 0.01);
  const evidenceCoverage = availableWeight;
  const confidence = available.reduce((total, [name, result]) => total + result.confidence * WEIGHTS[name], 0);
  let score = weightedScore * (0.7 + evidenceCoverage * 0.3);
  if (profile.duplicateRate > 0.5) score -= 15;
  if (profile.missingCellRate > 0.4) score -= 15;
  if (profile.schemaConsistencyRate < 0.7) score -= 10;
  if (profile.dimensions.provenance.score === undefined) score = Math.min(score, 84);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    confidence: Number(Math.max(0, Math.min(1, confidence)).toFixed(2)),
    methodologyVersion: "1.0.0",
    components: profile.dimensions,
    limitations: [...new Set(entries.flatMap(([, result]) => result.limitations))]
  };
}
