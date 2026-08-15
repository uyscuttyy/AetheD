# AetheD Engineering Handoff

## Where We Are

AetheD is a functioning local prototype at commit `785f61a`. The verification domain is tested, the framework-neutral API handlers are tested, and the Next.js marketplace pages compile and run locally. The web UI uses synthetic demo data and is not yet connected to the API or a wallet.

The product thesis remains: **AetheD is the trust layer for machine-readable data, turning raw datasets into verified, scored, and programmable assets for AI agents.** The current implementation proves the verification and presentation concepts locally; it does not yet prove decentralized storage or commerce.

## Recently Completed

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
- Installed npm dependencies and fixed strict TypeScript errors.

## Currently Working

- `npm test`: 9 test files, 22 tests passing.
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

- `apps/api` has no server entry point or route adapter.
- No persistent database or durable queue.
- Prisma is not yet migrated or wired into the runtime repository.
- Standalone API state resets whenever its process restarts.
- Seller upload is local/in-memory and submits the complete file as JSON; it is not production streaming or durable.
- Web pages consume `apps/web/lib/demo-data.ts`, not API responses.
- Marketplace search/filter controls are presentational.
- Wallet connection, authentication, purchases, payments, access grants, and dashboards are absent.
- No 0G Storage adapter or 0G Chain contract exists.
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

The persistence foundation is now implemented:

1. Mount `PrismaDatasetRepository` behind a runtime repository factory and move the standalone API off in-memory state.
2. Add Redis/BullMQ or equivalent durable job processing.
3. Add a Fastify HTTP adapter under `/api/v1` with request validation and OpenAPI.
4. Replace whole-file JSON submission with multipart/streaming limits and durable verification progress.
5. Wire marketplace and detail pages to API data.

After that, integrate 0G Storage and deploy the dataset registry/purchase contract before adding wallet purchase/access behavior.

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

**Last Updated:** 2026-08-15  
**Last Audit:** 2026-08-15, full audit against commit `785f61a`; seller flow and HTTP adapter added afterward in the working tree.
