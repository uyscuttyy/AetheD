# AetheD

Verified data for autonomous AI.

AetheD is a trust layer for machine-readable data. It profiles uploaded datasets, records evidence-backed verification results, calculates a versioned AetheScore, produces a Data Passport, and makes verified assets discoverable and purchasable by people and AI agents.

## Current status

Milestone 1 implements bounded CSV/JSON/JSONL parsing, deterministic profiling, evidence-aware verification dimensions, integrity hashing, and AetheScore methodology `1.0.0`. Marketplace UI, persistence, 0G adapters, and contracts are intentionally not implemented yet.

## Planned architecture

- `apps/web`: Next.js human interface
- `apps/api`: typed marketplace and agent API
- `packages/domain`: shared entities and business interfaces
- `packages/config`: validated runtime configuration
- `contracts`: Foundry Solidity marketplace contracts in a future milestone
- `docs`: architecture and operational documentation

The MVP will use deterministic local verification, 0G Storage for dataset and passport artifacts, and 0G Chain for registration and purchases. 0G Compute remains an optional provider for model-based analysis.

## Local setup

```bash
npm install
cp .env.example .env
npm run typecheck
npm test
```

No secrets are committed. Mainnet deployment will be a later, explicit milestone after testnet validation.
