# AetheD Persistent Technical Memory

## Current Project State

The official 0G Storage integration now targets Galileo Testnet through `@0gfoundation/0g-storage-ts-sdk@1.2.11`. `ZeroGStorageArtifactStore` uses the SDK's `Indexer` and `ZgFile` APIs, validates the locally calculated Merkle root against the upload result, and retrieves by root hash with proof verification.

AetheD is a TypeScript repository with a Next.js 15 web demo, a framework-neutral domain/API layer, and a standalone Node API that can explicitly select PostgreSQL persistence. There is no deployed production backend, contract, or 0G integration.

The working implementation is split between:

- `apps/web`: Next.js App Router human interface using synthetic in-module data.
- `apps/api/server.ts`: standalone Node HTTP adapter with injected dependencies and environment-configured runtime persistence.
- `packages/domain/src`: parsing, profiling, scoring, passports, artifacts, repository/job abstractions, application service, and API handlers.
- `packages/config/src/env.ts`: runtime configuration validation.
- `tests`: Vitest unit/integration-style tests for the domain and in-memory service.

The seller vertical slice adds `/sell` plus local Next routes under `apps/web/app/api/v1`. `getLocalApi()` stores the in-memory repository/service on `globalThis` so local hot reloads can reuse the process state. This is a development bridge, not durable persistence.

## Important Technical Decisions

- TypeScript is strict at the root (`tsconfig.json`), with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, NodeNext modules, and no emitted JS.
- The web app has its own `apps/web/tsconfig.json` generated for Next.js; it is looser and uses `jsx: preserve`.
- npm is the declared package manager (`npm@10.9.8`). `package-lock.json` is committed.
- Next.js App Router is used for the web UI. A standalone backend runtime exists, but no durable worker runtime exists yet.
- Domain logic is framework-neutral and exported from `packages/domain/src/index.ts` so an HTTP adapter and worker can be added without moving verification logic into Next.js.
- Verification is deterministic and local. No OpenAI or other paid AI service is required.
- AI utility is deliberately `inferred` with low confidence. Unknown provenance/freshness is not upgraded to verified.
- Dataset payloads are represented as parsed records in the current prototype. The intended production design is streaming and durable storage.
- `ArtifactStore`, `DatasetRepository`, `VerificationJobQueue`, and `VerificationInputStore` remain replaceable interfaces. PostgreSQL, BullMQ/Redis, and filesystem-backed input adapters now exist.
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
- `VerificationApplicationService` writes inputs through `VerificationInputStore` before enqueueing identifiers. The configured API uses filesystem-backed inputs and BullMQ, allowing a new worker process to recover queued work when the artifact root is persistent and shared.
- `AetheDApi.search` loops over the repository in memory, chooses the most recently created version, and only returns `published` datasets.
- The web dataset detail page is an async server component using static demo data. Buy and wallet controls have no action behind them.
- `/sell` reads the entire browser file with `File.text()` and submits it as JSON. Production must replace this with bounded multipart/streaming upload.
- The standalone multipart upload route returns queued work; `apps/api/worker.ts` processes BullMQ jobs separately.

## Known Constraints

- Do not describe local storage as 0G Storage.
- Do not describe the demo score as independently verified provenance.
- Do not add paid LLM dependencies to make the deterministic MVP work.
- Do not put raw dataset data or verbose evidence on-chain.
- Preserve dataset version identity; never overwrite historical verification results when adding a new version.
- Treat uploads and metadata as untrusted. The current parser is not yet a complete production security boundary.
- Keep the web demo usable while replacing demo data with API data incrementally.

## Known Problems and Technical Debt

- A real Galileo upload/retrieval test is present but remains skipped until a dedicated funded testnet `PRIVATE_KEY` is supplied with `OG_STORAGE_INTEGRATION=true`.
- The Galileo signer is now funded and `AetheDRegistry` is deployed at `0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c` on chain `16602`.
- `GalileoRegistryPublisher` is wired into the worker when `OG_CONTRACT_ADDRESS` is configured. It requires the submitted seller address to match the configured signer and persists registry publication receipts on the verification.
- The full Galileo flow succeeded on 2026-08-17: storage upload transaction `0xb0b5163602062576ebd336a15afe160fb1ed3a5635208421a43c13230e3061a8`, dataset registration `0x01dc6b169c81ea06deb2fa47853d68ae7a3e6a85b479be88f0ea70e1d1a12b04`, and version registration `0x9d657dfa310430cb09612b0afd897fa9bbb8e0924da4bcd37af2a293ddf7cbf4`. The public receipt is `docs/galileo-smoke-2026-08-17.json`.
- Commerce reconciliation verifies the deployed contract's `DatasetVersionPurchased` receipt, matches the exact persisted version key, and creates idempotent `Purchase` and `AccessGrant` records.
- Access lookup requires a fresh EIP-191 buyer signature. This protects the API response, but public 0G roots still require encryption or mediated delivery before access control is production-complete.
- The current Builder Hub points to `0gfoundation/0g-storage-ts-sdk`; its repository main branch declares 1.2.9 while npm publishes 1.2.11. AetheD pins 1.2.11.
- The SDK README uses the turbo testnet indexer in its example, while the current Hacker Guide lists the standard indexer. AetheD uses the Hacker Guide standard endpoint from environment configuration.

- Root `README.md`, `apps/web/README.md`, and `docs/milestones.md` lag behind the current implementation and describe earlier milestones.
- The standalone API selects persistence only through validated `PERSISTENCE_PROVIDER`; production rejects memory and PostgreSQL requires `DATABASE_URL`.
- PostgreSQL schema, migration, repository, and runtime factory are present; Redis is configured but not wired.
- BullMQ jobs retry four times with exponential backoff. A formal dead-letter/replay UI is not implemented.
- The service stores complete parsed datasets in memory and does not stream large files.
- The parser has no malware scanning, CSV-injection mitigation policy, URL/metadata safety policy, or near-duplicate detection.
- There is no authentication, authorization, rate limiting, wallet integration, access grant, or purchase implementation.
- 0G Chain, 0G Storage, and 0G Compute are absent from runtime code.
- Marketplace and detail pages read the standalone API when `AETHED_API_URL` is set; controls themselves remain mostly presentational.
- There are no browser/e2e tests or screenshot checks.
- Production build currently exits with a generic webpack error after optimized compilation; tests, typecheck, lint, and development compilation pass.
- `npm run build` compiles the Next app, but long final build tracing should be rerun after future changes.

## HTTP Adapter

`apps/api/server.ts` is a standalone Node HTTP adapter around `AetheDApi`. It exposes `/health`, `POST /api/v1/datasets`, and `GET /api/v1/verifications/:id`, uses the configured upload limit, and runs with `npm run api:dev`. Tests inject dependencies. The configured entrypoint uses validated host, port, artifact, and persistence settings and closes persistence on SIGINT/SIGTERM.

## Persistence Contract

`prisma/schema.prisma` is validated and Prisma Client 6.19.3 generates successfully. The initial migration is in `prisma/migrations/20260815190000_initial/migration.sql` and has been applied to the local PostgreSQL container. `packages/infrastructure/src/prisma-dataset-repository.ts` implements the domain `DatasetRepository`. `packages/infrastructure/src/runtime.ts` selects memory or PostgreSQL only when explicitly requested; production configuration requires PostgreSQL. `docker-compose.yml` defines local PostgreSQL 16 and Redis 7.

## Environment Requirements

- Node.js 22.22.3 was used for the current audit; package metadata declares npm `10.9.8`.
- npm is required; run `npm install` from the repository root.
- Root environment placeholders include `NODE_ENV`, `PERSISTENCE_PROVIDER`, `DATABASE_URL`, `REDIS_URL`, `API_HOST`, `API_PORT`, `MAX_UPLOAD_BYTES`, `AETHED_ARTIFACT_ROOT`, `WEB_ORIGIN`, and optional `OG_*` values.
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
