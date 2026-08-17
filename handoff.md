# AetheD Engineering Handoff

## Where We Are

AetheD is a functioning prototype with deterministic verification, a Next.js marketplace demo, PostgreSQL/BullMQ runtime infrastructure, a 0G Storage adapter, and a deployed Galileo registry/purchase contract. The web UI still uses synthetic fallback data and is not connected to a wallet.

The product thesis remains: **AetheD is the trust layer for machine-readable data, turning raw datasets into verified, scored, and programmable assets for AI agents.** The current implementation proves the verification and presentation concepts locally; it does not yet prove decentralized storage or commerce.

## Recently Completed

- Researched the current official 0G Builder Hub and SDK repository.
- Installed `@0gfoundation/0g-storage-ts-sdk@1.2.11` and `ethers@6.13.1`.
- Added a server-only Galileo Storage adapter for Merkle-root generation, signed upload, transaction/root-hash validation, and proof-enabled retrieval.
- Wired exact dataset uploads into verification so the 0G root hash enters the Data Passport.
- Deployed `AetheDRegistry` to Galileo chain `16602` at `0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c`.
- Added a server-side registry publisher that idempotently registers dataset/version hashes and persists chain keys and transaction receipts.
- Enforced signer/seller equality for chain-enabled submissions.

- Added bounded CSV/JSON/JSONL parsing.
- Added deterministic profiling for missingness, exact duplicates, schema consistency, type consistency, and integrity hashes.
- Added evidence-aware AetheScore methodology `1.0.0`.
- Added replaceable verification pipeline and versioned Data Passport generation.
- Added safe local artifact storage abstraction.
- Added in-memory dataset/version/verification repository and job queue.
- Added application service for queued verification and publication state transitions.
- Added typed framework-neutral API handlers for submit, status, detail, and search.
- Added Next.js homepage, marketplace, dataset detail page, reusable AetheScore/Data Passport/DatasetCard components, and synthetic demo data.
- Added `/sell`, local Next API routes for submission/status, and route-level adapter tests.
- Added a standalone Node HTTP adapter, `npm run api:dev`, and an ephemeral server test.
- Added a validated Prisma schema, generated client, and local PostgreSQL/Redis Compose services.
- Added explicit runtime persistence selection, production rejection of memory persistence, validated API settings, dependency-injected server tests, and graceful database shutdown.
- Added BullMQ/Redis verification jobs, filesystem-backed durable verification inputs, a separate worker process, retries, and restart-focused tests.
- Added bounded multipart upload streaming with private staging files, filename sanitization, and format/size enforcement.
- Added API-backed marketplace/detail reads and production seller upload/status proxying through `AETHED_API_URL`.
- Installed npm dependencies and fixed strict TypeScript errors.

## Currently Working

- Add browser wallet purchase, receipt reconciliation, and version-specific access grants.
- Purchase receipt reconciliation and signed exact-version access lookup are implemented in the API; browser wallet transaction preparation and encrypted delivery remain next.
- `npm test`: 10 test files and 25 tests passing; one PostgreSQL integration test is skipped without `DATABASE_URL`.
- `npm run typecheck`: passing.
- Next.js development server starts with `npm run dev -- --hostname 127.0.0.1 --port 3000`.
- Human demo routes:
  - `/`
  - `/marketplace`
  - `/sell`
  - `/datasets/crypto-sentiment-pro`
- Domain test flow can submit a dataset through `AetheDApi`, process it, inspect status, and search the published in-memory result.
- Browser seller flow can submit CSV/JSON/JSONL and render the resulting local score/passport.
- Standalone API exposes `/health`, dataset submission, and verification lookup locally.

## Incomplete

- PostgreSQL can persist dataset/version/verification records when explicitly configured.
- Production requires a persistent shared `AETHED_ARTIFACT_ROOT`; local container disk alone is not sufficient for multiple worker replicas.
- Verification parsing still materializes the bounded staged file in worker memory after upload; truly large datasets need incremental parser/profiler stages.
- Web pages fall back to labeled demo data if `AETHED_API_URL` is missing or unavailable.
- Marketplace search/filter controls are presentational.
- Wallet connection, authentication, purchases, payments, access grants, and dashboards are absent.
- Browser wallet connection and purchase submission are absent. Backend receipt reconciliation and signed access grants are present, but 0G artifacts are not yet encrypted per buyer.
- The standard Galileo Storage indexer returned HTTP 503 during the smoke run; the successful proof used the responsive turbo indexer endpoint.
- No mainnet contract address or Explorer activity exists for the Buildathon submission.
- No real 0G Compute integration exists.
- No browser/e2e tests, deployment configuration, or production observability.
- `npm run build` currently exits with a generic webpack error after reaching optimized compilation; no useful module diagnostic is emitted.

## Known Broken or Misleading Areas

- Root `README.md` says marketplace UI and persistence are not implemented, which is stale. The new context files are the current audit-based reference until README is updated in a future documentation pass.
- `apps/web/README.md` says the web interface will be implemented later, which is stale.
- `docs/architecture.md` describes planned PostgreSQL/0G/contract behavior as if it were the architecture; use the new root `architecture.md` for the audited split between current and planned systems.
- The browser Buy and Connect Wallet buttons do not perform actions; the dataset detail page explicitly says the wallet is not connected.
- The demo Data Passport shows “Pending 0G” and synthetic/limited provenance by design. Do not change those labels to imply integration.
- A completed local verification can be published in memory even though the artifact is only on local disk.

## Do Not Change Unnecessarily

- Keep verification domain logic independent of Next.js and future HTTP frameworks.
- Preserve the distinction between measured, inferred, seller-provided, and unknown evidence.
- Preserve dataset/version-specific hashes and passports.
- Preserve the AetheScore methodology version and explicit provenance cap until a deliberate methodology change is documented.
- Keep raw datasets off-chain; use hashes/references for future contract records.
- Do not introduce an OpenAI requirement for the MVP.
- Do not silently replace synthetic demo data with claims of real-world provenance.

## Highest-Priority Next Work

Connect the dataset detail page to a browser wallet, prepare the exact `purchase(versionKey)` transaction, submit its receipt for reconciliation, and replace raw storage-root access with encrypted or mediated delivery.

## How to Run

```bash
cd /home/user_uy_scutty/AetheD
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

For checks:

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

## How to Verify Manually

1. Open the homepage and confirm the verification flow and agent section.
2. Open `/marketplace` and confirm three synthetic dataset cards.
3. Open `/datasets/crypto-sentiment-pro` and `/sell`.
4. Expand AetheScore and confirm provenance is not presented as verified.
5. Confirm the Data Passport shows the version, hash, synthetic status context, and `Pending 0G`.
6. Upload a small JSON/CSV file at `/sell` and confirm a score/passport appears.
7. Run `npm test` and confirm the default suite passes. Run the Prisma integration test with a reachable PostgreSQL `DATABASE_URL`.

## Important Context

The Buildathon Wave 3 submission requires a public repository, meaningful commits, a 0G mainnet contract address, Explorer activity, at least one real 0G component, a short demo video, documentation, and a required X post. None of the mainnet/0G proof requirements are satisfied yet.

**Last Updated:** 2026-08-17
**Last Audit:** 2026-08-17, live Galileo upload/retrieval and registry publication completed; public receipt saved under `docs/`.
