# AetheD Product Requirements Document

## Product Overview

**Product:** AetheD  
**One-line description:** Verified data for autonomous AI.

AetheD is a trust layer and marketplace foundation for machine-readable datasets. It analyzes dataset structure and quality, calculates an evidence-aware AetheScore, generates a version-specific Data Passport, and is intended to let humans and AI agents discover, evaluate, purchase, and access datasets.

The current repository is a tested prototype with deterministic verification, PostgreSQL persistence, Redis-backed jobs, bounded multipart uploads, API-backed marketplace/detail paths, a 0G Storage adapter, and a separate worker. A registry/purchase contract is deployed on Galileo and the worker can publish verified version hashes to it. Browser-wallet commerce and signed access lookup are implemented for registered listings. Encrypted delivery, mainnet deployment, and a live buyer purchase remain incomplete.

## Problem

AI agents can search and call APIs but lack reliable machine-readable evidence for deciding whether a dataset is suitable or trustworthy. Typical marketplaces emphasize listings and commerce while leaving quality, integrity, provenance, and limitations opaque.

AetheD makes verification the product and the marketplace its interface. It distinguishes measured properties, seller-provided evidence, inferred properties, and unknown evidence.

## Target Users

- Primary: autonomous AI agents searching for machine-readable datasets.
- Secondary: AI developers, researchers, startups, companies, and data buyers.
- Supply side: data providers, collectors, labelers, researchers, developers, companies, and individuals.

## Core Value Proposition

An exact dataset version receives structured verification evidence, an explainable AetheScore, an integrity hash, and a Data Passport. Those signals can be consumed by both a web interface and a predictable agent API.

## Current Functionality

### 0G Galileo Storage Adapter — Implemented and Proven on Galileo

- Uses `@0gfoundation/0g-storage-ts-sdk@1.2.11` with `Indexer` and `ZgFile`.
- Uploads exact dataset bytes with a server-side testnet signer.
- Validates the SDK upload root hash against the locally generated Merkle root.
- Places the content-derived root hash in the Data Passport.
- Supports proof-enabled retrieval by root hash.
- A live 82-byte artifact was uploaded and proof-retrieved on 2026-08-17. The root and transaction receipt are recorded in `docs/galileo-smoke-2026-08-17.json`.

### Galileo Registry Publication — Implemented and Proven

- `AetheDRegistry` is deployed on chain `16602` at `0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c`.
- After verification and artifact storage, the worker can register the dataset and exact version integrity hashes.
- Dataset keys, version keys, and transaction hashes are persisted with the verification record.
- Publication is idempotent for worker retries and requires `sellerAddress` to match the configured signer because the contract uses `msg.sender` as seller ownership.
- Live dataset/version transactions and contract read-back completed on 2026-08-17. The browser buyer flow and backend event reconciliation/access grants are implemented; protected artifact delivery remains outstanding.

### Deterministic Dataset Parsing — Implemented

- Supports CSV, JSON, and JSONL object records.
- Enforces a default 25 MB input limit and 250,000-record limit.
- Handles quoted CSV fields, unique/non-empty CSV headers, malformed data, invalid records, and unsupported extensions.
- Lives in `packages/domain/src/dataset.ts` and `packages/domain/src/parser.ts`.
- Covered by `tests/parser.test.ts`.

### Verification Profiling — Implemented

- Calculates record/column counts, missing-cell rate, exact duplicate rate, schema consistency, type consistency, and SHA-256 content integrity.
- Produces quality, cleanliness, uniqueness, freshness, consistency, provenance, and AI-utility dimensions.
- Labels evidence as `measured`, `sellerProvided`, `inferred`, or `unknown`.
- Freshness is unknown unless a timestamp is supplied. Provenance is unknown unless evidence is supplied. AI utility is explicitly a low-confidence structural inference.
- Lives in `packages/domain/src/verification.ts`.
- Covered by `tests/verification.test.ts`.

### AetheScore — Implemented, Initial Methodology

- Methodology version `1.0.0` uses weighted dimensions rather than a simple average.
- Weights: quality 20%, cleanliness 15%, uniqueness 15%, freshness 10%, consistency 15%, provenance 15%, AI utility 10%.
- Adjusts for evidence coverage and applies penalties for severe duplication, missingness, or schema inconsistency.
- Caps the total at 84 when provenance is unknown.
- Preserves component evidence, confidence, and limitations.
- Lives in `packages/domain/src/scoring.ts`.
- The methodology is functional but has not been calibrated against a representative real-world benchmark corpus.

### Verification Pipeline and Data Passport — Implemented Locally

- Runs optional replaceable async stages, then profiles, scores, and generates a passport.
- Data Passport includes dataset/version identity, score, confidence, format, size, record count, content hash, dimensions, limitations, timestamp, and passport hash.
- Supports optional future storage and verification artifact references.
- Lives in `packages/domain/src/pipeline.ts` and `packages/domain/src/passport.ts`.
- Covered by `tests/pipeline.test.ts`.

### Artifact Storage Boundary — Implemented Locally

- `ArtifactStore` defines replaceable `put`/`get` operations.
- `LocalArtifactStore` writes immutable files under a configured root, creates directories, hashes content, and rejects invalid/path-traversing references.
- Lives in `packages/domain/src/artifact.ts`.
- This is not 0G Storage.

### Dataset, Version, Verification, and Job Model — Implemented In Memory

- Repository models datasets, immutable version records, and verification lifecycle states.
- Dataset states: `draft`, `verifying`, `published`, `failed`.
- Verification states: `queued`, `running`, `completed`, `failed`.
- In-memory queue processes jobs once and prevents concurrent consumers.
- Application service submits datasets, queues work, persists verification artifacts, and updates state.
- Lives in `repository.ts`, `jobs.ts`, and `service.ts` under `packages/domain/src`.
- Data and pending uploads are lost when the process restarts.

### Framework-Neutral API Contract — Implemented, Not Deployed

- `AetheDApi` implements typed handler methods for submission, processing, verification status, dataset detail, and search.
- Success responses use `{ data: ... }`; failures use `{ error: { code, message } }`.
- Search only returns published datasets and supports text, category, minimum score, format, and limit filters.
- Lives in `packages/domain/src/api.ts` and is documented in `docs/agent-api.md`.
- There is no HTTP server, routing adapter, OpenAPI document, authentication, multipart upload, or network endpoint.

### Human Marketplace — Implemented as a Synthetic Demo

- Next.js App Router pages:
  - `/`: product homepage and verification positioning.
  - `/marketplace`: demo search/filter layout and dataset cards.
  - `/datasets/[id]`: dataset detail, evidence summary, score breakdown, and Data Passport.
- Reusable components live in `apps/web/components`.
- Styling lives in `apps/web/app/styles.css` and follows the cream/forest AetheD visual system.
- Data comes only from `apps/web/lib/demo-data.ts`; controls are largely visual.
- Demo content is labeled synthetic, provenance is limited, 0G is pending, and wallet transactions are explicitly disconnected.

### Seller Upload and Local Verification Flow — Implemented Locally

- `/sell` accepts dataset metadata and a CSV, JSON, or JSONL file.
- The browser submits file text to `apps/web/app/api/v1/datasets/route.ts`, which adapts the existing `AetheDApi` and processes the in-memory queue for the local demo.
- `apps/web/app/api/v1/verifications/[id]/route.ts` returns the resulting verification, score, limitations, and passport.
- The page renders progress, failure, score/confidence, and passport hashes.
- This is not durable, streaming, authenticated, or connected to the static marketplace cards.

### Standalone HTTP API Adapter — Implemented Locally

- `apps/api/server.ts` exposes `GET /health`, `POST /api/v1/datasets`, and `GET /api/v1/verifications/:id` over Node HTTP.
- Request bodies are bounded to 25 MB and responses retain the domain API envelopes.
- `npm run api:dev` runs the TypeScript server through `tsx` using validated `API_HOST`, `API_PORT`, upload limit, artifact root, and persistence settings.
- PostgreSQL is selected explicitly, verification inputs are written before BullMQ enqueueing, and a separate worker handles queued jobs with retries.

### Runtime Configuration — Partially Implemented

### Persistence Schema — Implemented and Runtime-Selectable

- `prisma/schema.prisma` defines users, datasets, versioned dataset records, verifications, dimension evidence, passports, and artifact references.
- Dataset versions are unique per dataset/version string and retain separate verification/passport records.
- `docker-compose.yml` defines local PostgreSQL 16 and Redis 7 services.
- Prisma validation/client generation and the initial migration are present. The standalone API can select PostgreSQL through `PERSISTENCE_PROVIDER=postgresql`; production rejects memory.

- `packages/config/src/env.ts` validates persistence provider, database/Redis URLs, API host/port, upload limit, artifact root, web origin, and optional 0G settings.
- `.env.example` contains placeholders only.
- The current web demo does not consume the database, Redis, or 0G values.

## Current User Flows

### Supported Human Demo Flow

1. Open the homepage.
2. Navigate to Marketplace.
3. Browse three synthetic dataset cards.
4. Open a dataset detail page.
5. Expand AetheScore to inspect dimensions and unknown provenance.
6. Review the demo Data Passport.

### Supported Programmatic/Test Flow

1. Submit dataset text to `AetheDApi.submitDataset`.
2. Parse and create in-memory dataset/version/verification records.
3. Call `processVerifications` to consume queued work.
4. Generate a local verification artifact, score, and passport.
5. Search the published record or fetch its details/status.

This flow is only exercised directly in tests; it is not reachable over HTTP or from the web UI.

## Intended Product Requirements

- Uploaded data must be treated as untrusted and processed within explicit resource limits.
- Every purchase/access decision must identify an exact dataset version.
- Unknown evidence must never be represented as verified.
- Inferred AI utility must remain distinguishable from measured quality.
- AetheScore methodology and pipeline outputs must be versioned.
- Dataset content must remain off-chain; hashes, identifiers, ownership, and commerce references belong on-chain.
- Humans and agents should use the same underlying discovery and verification data.
- Secrets, private keys, and credentials must come from environment/secrets management.

## Future Requirements Evident in the Repository and Established Direction

### Partially Designed

- HTTP adapter mounted under `/api/v1` with OpenAPI documentation.
- PostgreSQL repository implementation and Redis-backed job queue.
- Seller upload and verification-progress UI wired to the domain service.
- Web marketplace wired to persisted API data instead of demo constants.
- 0G Storage adapter implementing `ArtifactStore`.

### Not Implemented

- Wallet authentication and session handling.
- Smart contract for dataset registration, version hashes, purchases, payments, and authorization records.
- 0G testnet/mainnet deployment and Explorer proof.
- Purchase confirmation and version-specific access grants.
- Protected downloads or programmatic data access.
- Buyer and seller dashboards.
- Durable retries, dead-letter handling, rate limiting, malware scanning, streaming uploads, and operational monitoring.
- Live 0G Compute integration; it is optional and must not be faked.

## Non-Goals for the Current Prototype

- It does not provide production-grade decentralized storage or commerce.
- It does not claim synthetic demo datasets have verified provenance.
- It does not require OpenAI or any paid LLM service.
- It does not put dataset payloads on-chain.
