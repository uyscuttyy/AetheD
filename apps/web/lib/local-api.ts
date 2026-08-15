import { AetheDApi, InMemoryDatasetRepository, InMemoryVerificationQueue, LocalArtifactStore, VerificationApplicationService } from "../../../packages/domain/src/index.js";

type LocalApiState = { api: AetheDApi; repository: InMemoryDatasetRepository; service: VerificationApplicationService };
const key = "__aethedLocalApi";

export function getLocalApi(): LocalApiState {
  const runtime = globalThis as typeof globalThis & { [key]?: LocalApiState };
  if (runtime[key]) return runtime[key];
  const repository = new InMemoryDatasetRepository();
  const service = new VerificationApplicationService(repository, new InMemoryVerificationQueue(), new LocalArtifactStore(process.env.AETHED_ARTIFACT_ROOT ?? "/tmp/aethed-artifacts"));
  const state = { api: new AetheDApi(repository, service), repository, service };
  runtime[key] = state;
  return state;
}
