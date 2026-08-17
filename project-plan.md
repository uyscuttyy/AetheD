# AetheD Project Plan

## Current Persistence Milestone

- **Status:** Complete for repository runtime selection; durable job processing remains next.
- **Files:** `prisma/schema.prisma`, `prisma/migrations/20260815190000_initial/migration.sql`, `packages/infrastructure/src/prisma-dataset-repository.ts`, `packages/infrastructure/src/runtime.ts`, `apps/api/server.ts`, and related tests.
- **Definition of done:** migration applied locally, Prisma client generated, repository round-trip test passes, standalone API selects PostgreSQL explicitly, and production rejects memory persistence.

This roadmap starts from the audited repository state. It does not represent a greenfield plan.

## Completed

### P0 — Deterministic verification core

- **Status:** Complete
- **Relevant files:** `packages/domain/src/parser.ts`, `verification.ts`, `scoring.ts`, `tests/parser.test.ts`, `tests/verification.test.ts`
- **Description:** Parse bounded CSV/JSON/JSONL input and calculate measured/inferred verification dimensions and AetheScore `1.0.0`.
- **Dependencies:** None.
- **Definition of done:** Implemented and covered by passing tests.

### P0 — Passport and local artifact boundary

- **Status:** Complete locally
- **Relevant files:** `packages/domain/src/passport.ts`, `pipeline.ts`, `artifact.ts`, `tests/pipeline.test.ts`
- **Description:** Generate version-specific hashed Data Passports and write immutable local artifacts behind an interface.
- **Dependencies:** Verification core.
- **Definition of done:** Pipeline and path-safety tests pass. 0G replacement remains separate.

### P0 — In-memory lifecycle and API contract

- **Status:** Complete locally
- **Relevant files:** `repository.ts`, `jobs.ts`, `service.ts`, `api.ts`, `tests/api.test.ts`, `tests/service.test.ts`
- **Description:** Model dataset/version/verification states, queue verification, publish completed records, and expose typed handler behavior.
- **Dependencies:** Pipeline and passport.
- **Definition of done:** 19 repository tests pass across seven files; no network API is deployed.

### P0 — Human marketplace demo

- **Status:** Complete as synthetic demo
- **Relevant files:** `apps/web/app`, `apps/web/components`, `apps/web/lib/demo-data.ts`
- **Description:** Homepage, marketplace, detail page, AetheScore, Data Passport, and responsive styling.
- **Dependencies:** Next.js/npm.
- **Definition of done:** Next.js compiles and local dev server runs. UI is not connected to backend data.

## In Progress

### P0 — Seller upload and local verification vertical slice

- **Status:** Complete locally; production replacement required
- **Priority:** Highest
- **Description:** `/sell` selects CSV/JSON/JSONL, submits through local Next API routes, runs the existing verification service, and displays the resulting score/passport.
- **Relevant files:** `apps/web/app/sell/page.tsx`, `apps/web/app/api/v1`, `apps/web/lib/local-api.ts`, `tests/web-api.test.ts`
- **Dependencies:** Existing domain API and verification engine.
- **Definition of done:** Local upload/result flow works and route tests pass. Durability, streaming, auth, and marketplace projection remain unfinished.

### P0 — Infrastructure integration preparation

- **Status:** Partially complete
- **Priority:** Highest
- **Description:** The Prisma repository is mounted behind explicit validated runtime configuration. Replace the process-local queue and pending payload map with durable processing.
- **Relevant files:** `packages/domain/src/repository.ts`, `jobs.ts`, `service.ts`, `api.ts`, `apps/api`
- **Dependencies:** PostgreSQL/Redis choice, HTTP framework, deployment target.
- **Definition of done:** Records and jobs survive restart, failures/retries are persisted, and integration tests prove recovery.

### P0 — Standalone HTTP adapter

- **Status:** Complete locally; durability/authentication required
- **Priority:** High
- **Description:** Node HTTP server exposes health, dataset submission, and verification lookup using the existing API contract and a 25 MB JSON body limit.
- **Relevant files:** `apps/api/server.ts`, `tests/server.test.ts`, `package.json`
- **Dependencies:** `tsx` runtime.
- **Definition of done:** Ephemeral server test passes. It is not a production persistence or authentication boundary.

## Next

### P0 — Durable verification jobs

- **Status:** Complete for the bounded-file MVP
- **Priority:** Highest
- **Description:** Add a Redis-backed queue/worker and durable verification input references so queued work survives API and worker restarts.
- **Relevant files:** `packages/domain/src/jobs.ts`, `packages/domain/src/service.ts`, new infrastructure queue/worker modules, `apps/api`.
- **Dependencies:** `REDIS_URL`, PostgreSQL runtime persistence, durable artifact/input storage decision.
- **Definition of done:** Inputs are persisted before enqueueing, BullMQ jobs are recoverable, retries are configured, and unit/integration-capable tests exist.

### P0 — Production seller upload and verification UI

- **Status:** Complete for bounded multipart uploads
- **Description:** Replace the local whole-file JSON flow with multipart/streaming upload, durable queue progress, validation, score, limitations, and passport.
- **Relevant files:** `apps/web/app`, `apps/web/components`, `packages/domain/src/api.ts`
- **Dependencies:** HTTP adapter and durable service contract, or a temporary local adapter for the first vertical slice.
- **Definition of done:** A seller can submit a file from the browser and see the resulting version-specific verification result without hardcoded demo data.

### P0 — Persistent database and job worker

- **Status:** Complete for the current MVP
- **Description:** PostgreSQL schema/repository/runtime selection are implemented. Redis-backed worker, retries, and failure persistence remain.
- **Relevant files:** New `prisma/` or equivalent, `apps/api`, `packages/domain/src/repository.ts`, `jobs.ts`
- **Dependencies:** Local PostgreSQL/Redis and deployment choice.
- **Definition of done:** Data survives restart; queued work is recoverable; migrations and integration tests exist.

### P0 — 0G Storage adapter

- **Status:** Implemented, wired, and proven on Galileo
- **Description:** Implement the official current 0G Storage client behind `ArtifactStore`; store dataset artifact, manifest, verification JSON, and passport references.
- **Relevant files:** `packages/domain/src/artifact.ts`, new `packages/integrations/0g-storage`
- **Dependencies:** Confirm current official SDK/API, credentials, network, and testnet access.
- **Definition of done:** Completed on 2026-08-17 with proof-enabled retrieval; receipt saved in `docs/galileo-smoke-2026-08-17.json`.

### P0 — Smart contract and wallet purchase

- **Status:** Galileo contract deployed and publication client wired; buyer flow pending
- **Description:** Deploy a compact dataset/version registry and purchase contract; add wallet connection, purchase confirmation, and event reconciliation.
- **Relevant files:** `contracts/`, `apps/web`, `apps/api`, `.env.example`
- **Dependencies:** Confirm 0G chain ID/RPC/currency and official Buildathon network requirements.
- **Current boundary:** `AetheDRegistry` is deployed on Galileo chain `16602` at `0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c`. Live dataset/version registration and read-back are proven. Wallet purchase UI, purchase event reconciliation, and access issuance remain incomplete. `OG_CONTRACT_ADDRESS` stays optional with no fallback value.
- **Definition of done:** Run and document one live storage/registry publication, record a purchase on testnet, reconcile its receipt, and show the transaction/access state in the app.

### P0 — Access authorization

- **Status:** Backend grant and wallet-proof boundary implemented; encrypted delivery pending
- **Description:** Issue version-specific access grants only after confirmed purchases and prevent unauthorized retrieval.
- **Relevant files:** New access service/API routes, repository entities, contract event handlers.
- **Dependencies:** Durable persistence and purchase reconciliation.
- **Definition of done:** Reconciliation and denial behavior are implemented. Completion requires encrypted or mediated artifact delivery so knowledge of a 0G root is not sufficient to bypass authorization.

## Later

### P1 — Agent API deployment and SDK boundary

- **Status:** Contract only
- **Description:** Mount `/api/v1`, publish OpenAPI, add signed wallet/API-key authentication, and preserve machine-readable response/error schemas.
- **Relevant files:** `docs/agent-api.md`, `packages/domain/src/api.ts`, `apps/api`
- **Dependencies:** HTTP adapter, persistence, auth, access service.
- **Definition of done:** An external script can search, inspect, purchase, and access a dataset using documented endpoints.

### P1 — Buyer and seller dashboards

- **Status:** Not implemented
- **Description:** Show purchased access, seller dataset versions, verification status, revenue, and real purchase counts.
- **Relevant files:** `apps/web/app`, new dashboard components.
- **Dependencies:** Auth, persistence, commerce, access grants.
- **Definition of done:** All displayed metrics derive from real persisted records; no fake reputation values.

### P1 — Verification hardening

- **Status:** Partially implemented
- **Description:** Add streaming/chunked processing, near-duplicates, malware scanning, CSV-injection policy, metadata safety, and stronger provenance adapters.
- **Relevant files:** `packages/domain/src/parser.ts`, `verification.ts`, worker modules.
- **Dependencies:** Worker infrastructure and threat model.
- **Definition of done:** Resource/security tests cover oversized, malicious, malformed, and adversarial inputs.

## Future

### P2 — Optional 0G Compute provider

- **Status:** Not implemented
- **Description:** Add model-based semantic/AI-utility verification only when the current 0G Compute API is confirmed and useful.
- **Dependencies:** Official SDK/API, cost model, reproducibility policy.
- **Definition of done:** Results include provider/model/input hash/output hash and are labeled inferred.

### P2 — AetheD SDK

- **Status:** Not implemented
- **Description:** Typed client for search, purchase, and access using the agent API.
- **Dependencies:** Stable HTTP API and authentication.

### P2 — Seller reputation and disputes

- **Status:** Not implemented
- **Description:** Derive reputation only from real quality, purchases, updates, disputes, and buyer feedback.
- **Dependencies:** Commerce, persistence, dispute model, real usage.

## Buildathon Submission Gate

- **Status:** Not complete
- **Priority:** P0 before submission
- **Description:** Public repo/README, meaningful commits, 0G mainnet contract address, Explorer proof, real 0G component, under-three-minute demo, architecture/reproduction docs, and required X post.
- **Dependencies:** 0G Storage and/or Chain milestones, deployed demo, documentation, recording.
- **Definition of done:** Every Wave 3 submission requirement has a verifiable public link or artifact.
