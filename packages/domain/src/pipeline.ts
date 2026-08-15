import { calculateAetheScore, AetheScoreResult } from "./scoring.js";
import { createDataPassport, DataPassport } from "./passport.js";
import { profileDataset, VerificationInput, VerificationProfile } from "./verification.js";

export type VerificationContext = VerificationInput & { datasetId: string; version: string; name: string };
export type PipelineState = { profile?: VerificationProfile; score?: AetheScoreResult };
export type VerificationStage = {
  name: string;
  run(context: VerificationContext, state: PipelineState): Promise<PipelineState>;
};
export type VerificationArtifact = {
  datasetId: string;
  version: string;
  status: "completed";
  pipelineVersion: "1.0.0";
  profile: VerificationProfile;
  score: AetheScoreResult;
  passport: DataPassport;
};

export async function runVerification(context: VerificationContext, stages: VerificationStage[] = []): Promise<VerificationArtifact> {
  let state: PipelineState = {};
  for (const stage of stages) state = await stage.run(context, state);
  const profile = state.profile ?? profileDataset(context);
  const score = state.score ?? calculateAetheScore(profile);
  const passport = createDataPassport({
    datasetId: context.datasetId, version: context.version, name: context.name,
    dataset: context.dataset, profile, score
  });
  return {
    datasetId: context.datasetId, version: context.version, status: "completed",
    pipelineVersion: "1.0.0", profile, score, passport
  };
}
