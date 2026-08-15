# AetheD Persistent Technical Memory

## Current Project State

AetheD is a greenfield TypeScript repository with a Next.js 15 web demo and a framework-neutral domain/API layer. The current commit is `785f61a` (`phase 6 -bout to begin infrastructure integration`). The repository has no deployed backend, database, contract, or 0G integration.

The working implementation is split between:

- `apps/web`: Next.js App Router human interface using synthetic in-module data.
- `apps/api`: README placeholder only; no server entry point exists.
- `packages/domain/src`: parsing, profiling, scoring, passports, artifacts, repository/job abstractions, application service, and API handlers.
- `packages/config/src/env.ts`: runtime configuration validation.
- `tests`: Vitest unit/integration-style tests for the domain and in-memory service.

The seller vertical slice adds `/sell` plus local Next routes under `apps/web/app/api/v1`. `getLocalApi()` stores the in-memory repository/service on `globalThis` so local hot reloads can reuse the process state. This is a development bridge, not durable persistence.

## Important Technical Decisions

- TypeScript is strict at the root (`tsconfig.json`), with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, NodeNext modules, and no emitted JS.
- The web app has its own `apps/web/tsconfig.json` generated for Next.js; it is looser and uses `jsx: preserve`.
- npm is the declared package manager (`npm@10.9.8`). `package-lock.json` is committed.
- Next.js App Router is used for the web UI. There is no separate backend runtime yet.
- Domain logic is framework-neutral and exported from `packages/domain/src/index.ts` so an HTTP adapter and worker can be added without moving verification logic into Next.js.
- Verification is deterministic and local. No OpenAI or other paid AI service is required.
- AI utility is deliberately `inferred` with low confidence. Unknown provenance/freshness is not upgraded to verified.
- Dataset payloads are represented as parsed records in the current prototype. The intended production design is streaming and durable storage.
- `ArtifactStore`, `DatasetRepository`, and `VerificationJobQueue` are interfaces. Current implementations are local/in-memory substitutes, not production infrastructure.
- Data Passport and verification artifacts are version-specific and content-hashed.

## Conventions

- Source files use lowercase kebab-free names such as `verification.ts`, `data-passport.ts`, and `demo-data.ts`.
- Domain public types and functions are exported through `packages/domain/src/index.ts`.
- Type names are descriptive (`DatasetEntity`, `DatasetVersionRecord`, `VerificationRecord`); avoid reintroducing a `DatasetRecord` collision with parsed record types.
- ESM-style `.js` import specifiers are used in TypeScript domain files because the root compiler uses NodeNext.
- API handlers return `{ status, body }` values. Bodies use `{ data: ... }` for success and `{ error: { code, message } }` for failures.
- Tests live in `tests/*.test.ts` and use Vitest with the Node environment. Temporary artifacts are written under `/tmp` and cleaned up.
- UI uses direct React/Next components and one global stylesheet. The current components are intentionally small and domain-specific: `AetheScore`, `DataPassport`, and `DatasetCard`.
- The visual system uses CSS variables: cream `#F7F4EA`, forest `#123C2A`, muted green `#6F8F7A`, border `#E4E0D5`, and strong text `#10231A`.

## Important Implementation Details

- `parseDataset` accepts a filename and string/`Uint8Array`; extension determines format. It parses JSON arrays or a single object, JSONL objects, and CSV rows.
- `profileDataset` hashes the original raw bytes, not a normalized serialization. Exact duplicate detection uses sorted-key JSON serialization.
- Freshness only receives a score if `collectedAt` is provided. Provenance only receives a score if `verifiedProvenanceEvidence` is non-empty.
- `calculateAetheScore` uses methodology `1.0.0`, evidence coverage, confidence, penalties, and an 84 maximum when provenance is unknown.
- `runVerification` executes supplied stages in order, then defaults to the built-in profile/score and creates a passport.
- `LocalArtifactStore.put` is write-once (`flag: "wx"`) and rejects references that fail its safe character pattern. It is not an 0G client.
- `VerificationApplicationService` keeps raw submit inputs in `pendingInputs`, queues only IDs, and therefore loses pending work on process restart. It writes verification JSON locally and updates in-memory dataset/version/verification state.
- `AetheDApi.search` loops over the repository in memory, chooses the most recently created version, and only returns `published` datasets.
- The web dataset detail page is an async server component using static demo data. Buy and wallet controls have no action behind them.
- `/sell` reads the entire browser file with `File.text()` and submits it as JSON. Production must replace this with bounded multipart/streaming upload.
- The local POST route immediately processes the in-memory queue; production must return queued work and let a durable worker process it.

## Known Constraints

- Do not describe local storage as 0G Storage.
- Do not describe the demo score as independently verified provenance.
- Do not add paid LLM dependencies to make the deterministic MVP work.
- Do not put raw dataset data or verbose evidence on-chain.
- Preserve dataset version identity; never overwrite historical verification results when adding a new version.
- Treat uploads and metadata as untrusted. The current parser is not yet a complete production security boundary.
- Keep the web demo usable while replacing demo data with API data incrementally.

## Known Problems and Technical Debt

- Root `README.md`, `apps/web/README.md`, and `docs/milestones.md` lag behind the current implementation and describe earlier milestones.
- No HTTP server is mounted; `apps/api` is documentation-only.
- PostgreSQL schema, migration, and an isolated Prisma repository are present; the API runtime still uses memory and Redis is not wired.
- In-memory storage/queue does not survive restarts and has no retry/dead-letter model.
- The service stores complete parsed datasets in memory and does not stream large files.
- The parser has no malware scanning, CSV-injection mitigation policy, URL/metadata safety policy, or near-duplicate detection.
- There is no authentication, authorization, rate limiting, wallet integration, access grant, or purchase implementation.
- 0G Chain, 0G Storage, and 0G Compute are absent from runtime code.
- Marketplace controls are mostly static UI; search/filter inputs do not update results.
- There are no browser/e2e tests or screenshot checks.
- Production build currently exits with a generic webpack error after optimized compilation; tests, typecheck, lint, and development compilation pass.
- `npm run build` compiles the Next app, but long final build tracing should be rerun after future changes.

## HTTP Adapter

`apps/api/server.ts` is a standalone Node HTTP adapter around `AetheDApi`. It exposes `/health`, `POST /api/v1/datasets`, and `GET /api/v1/verifications/:id`, limits JSON bodies to 25 MB, and runs with `npm run api:dev`. It constructs in-memory state at process start, so it is a development adapter rather than durable production infrastructure.

## Persistence Contract

`prisma/schema.prisma` is validated and Prisma Client 6.19.3 generates successfully. The initial migration is in `prisma/migrations/20260815190000_initial/migration.sql` and has been applied to the local PostgreSQL container. `packages/infrastructure/src/prisma-dataset-repository.ts` implements the domain `DatasetRepository`, including lossless profile/score JSON snapshots plus normalized verification dimensions and passports. The production API still constructs `InMemoryDatasetRepository`; the Prisma adapter is not mounted by default. `docker-compose.yml` defines local PostgreSQL 16 and Redis 7.

## Environment Requirements

- Node.js 22.22.3 was used for the current audit; package metadata declares npm `10.9.8`.
- npm is required; run `npm install` from the repository root.
- Root environment placeholders are in `.env.example`: `DATABASE_URL`, `REDIS_URL`, `API_PORT`, `WEB_ORIGIN`, and optional `OG_*` values.
- The web demo and default test suite do not require services. Persistence integration tests require PostgreSQL and `DATABASE_URL`.
- No Foundry, Solidity, 0G CLI, or deployment tooling is present in the repository.

## Commands

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
npm run typecheck
npm test
npm run build
npm run lint
DATABASE_URL=postgresql://aethed:aethed@localhost:5432/aethed npm run db:validate
DATABASE_URL=postgresql://aethed:aethed@localhost:5432/aethed npm run db:generate
DATABASE_URL=postgresql://aethed:aethed@172.19.0.2:5432/aethed npm test -- tests/prisma-repository.test.ts
```

The web app is served by Next.js from `apps/web`. The current tests do not require PostgreSQL, Redis, or external services.
