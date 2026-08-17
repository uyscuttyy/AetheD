# AetheD Architecture

## Persistence Update

The artifact boundary can now select local storage for development or official 0G Storage for production. Production configuration requires `ARTIFACT_STORE_PROVIDER=0g`. The worker uploads exact dataset bytes, verifies the returned root hash against the SDK Merkle root, and stores that root hash in the Data Passport.

The worker can also publish verified dataset/version integrity records to the deployed Galileo registry at `0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c`. Registry publication is enabled only when `OG_CONTRACT_ADDRESS` is configured, requires the submitted seller to match the configured signer, and persists dataset/version keys and transaction hashes on the verification record.

The repository contains PostgreSQL persistence, BullMQ/Redis jobs, filesystem-backed durable verification inputs, bounded multipart uploads, a separate worker process, and API-backed web read paths. Production configuration rejects memory persistence.

## System Overview

AetheD currently consists of a Next.js frontend, a framework-neutral TypeScript domain layer, a standalone Node API, and a separate verification worker. The frontend uses the API when `AETHED_API_URL` is configured and otherwise exposes a labeled demo fallback.

```text
CURRENT

Browser
  |
  v
Next.js App Router (`apps/web`)
  |
  +--> Synthetic demo data (`apps/web/lib/demo-data.ts`)
  +--> `/sell` -> local Next route adapter -> in-memory domain service

Tests / future adapter
  |
  v
AetheDApi handlers
  |
  v
VerificationApplicationService
  |              |                 |
  v              v                 v
In-memory     In-memory       LocalArtifactStore
repository    job queue       filesystem artifacts
  |
  v
Parser -> Profile -> AetheScore -> Data Passport
```

## Current Architecture

### Frontend

- Framework: Next.js 15 App Router with React 19.
- Location: `apps/web`.
- Routes:
  - `app/page.tsx`: homepage.
  - `app/marketplace/page.tsx`: demo marketplace.
  - `app/datasets/[id]/page.tsx`: demo dataset detail.
- Components: `AetheScore`, `DataPassport`, `DatasetCard` under `apps/web/components`.
- Data source: static `apps/web/lib/demo-data.ts` only.
- Styling: global `apps/web/app/styles.css` with responsive cream/forest design.
- Authentication: none.
- Wallet/blockchain: visual controls only.
- Seller flow: `/sell` submits the complete selected file as JSON and renders the local verification result.

### Domain and Backend Logic

`apps/api/server.ts` is a standalone Node HTTP adapter. Backend behavior remains framework-neutral under `packages/domain/src`, and runtime persistence construction lives in `packages/infrastructure/src/runtime.ts`.

- Parsing: `dataset.ts`, `parser.ts`.
- Verification: `verification.ts`.
- Scoring: `scoring.ts`.
- Pipeline/passport: `pipeline.ts`, `passport.ts`.
- Artifact boundary: `artifact.ts`.
- Persistence boundary: `repository.ts`.
- Queue boundary: `jobs.ts`.
- Orchestration: `service.ts`.
- Handler contract: `api.ts`.

### Current Data Flow

```text
SubmitDatasetRequest
  -> validate required request fields
  -> parse bytes by filename format
  -> create dataset/version/verification in memory
  -> retain parsed/raw input in `pendingInputs`
  -> enqueue IDs in memory
  -> explicit `processPending()` call
  -> profile deterministic signals
  -> calculate AetheScore 1.0.0
  -> generate hashed Data Passport
  -> write verification JSON to local filesystem
  -> update in-memory records to completed/published
  -> search/detail/status handlers read in-memory state
```

### Storage and Database

- Database schema: `prisma/schema.prisma`; migration: `prisma/migrations/20260815190000_initial/migration.sql`.
- Adapter: `packages/infrastructure/src/prisma-dataset-repository.ts`; the configured standalone API selects it when `PERSISTENCE_PROVIDER=postgresql`.
- Config placeholders: PostgreSQL and Redis URLs exist in `.env.example`.
- Artifacts: `LocalArtifactStore` writes immutable files under a configured directory.
- Dataset files: not durably persisted by the service as a separate artifact.

### API

- `AetheDApi` is framework-neutral and is mounted by the standalone Node server.
- A local Next adapter exists at `apps/web/app/api/v1`; it is a development bridge and immediately processes verification in the request lifecycle.
- Intended mappings are documented in `docs/agent-api.md`.
- Search supports text, exact category, minimum score, exact format, and bounded result limit.
- `processVerifications()` is a test/local worker trigger and must not become a public production route.

### Authentication and Authorization

None. `sellerAddress` is accepted as unverified request text. There is no nonce signing, session, ownership check, purchase authorization, or access grant.

### Blockchain and 0G

- `ZeroGStorageArtifactStore` uploads and proof-downloads artifacts through the official 0G Storage SDK on Galileo.
- `GalileoRegistryPublisher` registers dataset and exact version hashes after successful verification/storage.
- Deployed Galileo contract: `0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c`, chain ID `16602`.
- Registry receipts are stored in `Verification.registryPublication`; the schema addition is in migration `20260817120000_registry_publication`.
- A documented upload/retrieval plus registry-write smoke flow completed on 2026-08-17; the public receipt is `docs/galileo-smoke-2026-08-17.json`. No 0G Compute client exists.
- Browser wallet purchase and access reconciliation remain unimplemented.

### Tests

- Vitest Node environment.
- Seven test files and 19 passing tests at the 2026-08-15 audit.
- Coverage includes parsing, profiling/scoring, pipeline/passport, artifact safety, repository/queue, application service, API behavior, and environment validation.
- No browser, contract, database, HTTP integration, or 0G integration tests.

### Deployment

No production deployment configuration exists. The web demo runs locally through `npm run dev`. Local database/worker services and a Galileo testnet contract exist, but there is no infrastructure-as-code, CI workflow, hosted API, mainnet deployment, or maintained deployment script/receipt artifact.

## Planned Architecture

The planned architecture is evident from interfaces, environment placeholders, existing docs, and Buildathon requirements. It is not current functionality.

```text
PLANNED

Humans -> Next.js Web ------------------------+
                                              |
Agents  -> Versioned REST/OpenAPI ------------+-> HTTP API/Auth
                                                   |
                           +-----------------------+--------------------+
                           |                       |                    |
                     Dataset service       Purchase/access       Search/read API
                           |
                    Durable job queue
                           |
                    Verification workers
                           |
              Parser/Profile/Score/Passport
                  |             |             |
             PostgreSQL     0G Storage     optional 0G Compute
                  |             |
                  +------ hashes/references ------> 0G Chain contract
                                                   registration/purchase
```

### Planned Frontend

- Seller upload and verification progress.
- API-backed marketplace/detail pages.
- Wallet authentication and purchase flow.
- Buyer/seller dashboards and access actions.

### Planned Backend

- Fastify or equivalent typed HTTP adapter under `/api/v1`.
- PostgreSQL repository implementation and migrations.
- Redis-backed durable queue/worker with retries.
- Multipart streaming, rate limiting, authorization, OpenAPI, logging, and monitoring.

### Planned 0G Integration

- 0G Storage for exact dataset versions, manifests, verification artifacts, and Data Passports.
- 0G Chain contract for compact dataset/version registration, ownership, pricing, purchases, and purchase events.
- Optional 0G Compute for clearly labeled inferred/model-based analysis only when technically justified.
- Mainnet contract address and Explorer activity are required for Wave 3 submission proof.

### Planned Commerce and Access Flow

```text
Buyer/agent selects exact version
  -> API returns transaction preparation data
  -> wallet signs purchase
  -> contract emits purchase event
  -> backend reconciles confirmed receipt
  -> version-specific AccessGrant is issued
  -> authorized download/API access is returned
```

Raw datasets and detailed evidence remain off-chain; only compact hashes, identifiers, references, ownership, prices, and purchase state belong on-chain.
