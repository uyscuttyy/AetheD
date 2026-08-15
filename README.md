# AetheD

Verified data for autonomous AI.

AetheD is a trust layer for machine-readable data. It profiles uploaded datasets, records evidence-backed verification results, calculates a versioned AetheScore, produces a Data Passport, and makes verified assets discoverable and purchasable by people and AI agents.

## Current status

AetheD currently includes a tested deterministic verification engine, AetheScore methodology `1.0.0`, versioned Data Passports, local artifact storage, in-memory repository and queue implementations, framework-neutral API handlers, a working Next.js marketplace demo, and a local `/sell` upload-to-verification flow.

The current implementation is a local prototype. PostgreSQL, Redis, wallet commerce, smart contracts, protected access, and real 0G integrations are not implemented yet. Synthetic marketplace records are clearly labeled and must not be presented as independently verified data.

## Planned architecture

- `apps/web`: Next.js human interface
- `apps/api`: API adapter boundary; domain handlers currently live in `packages/domain`
- `packages/domain`: shared entities and business interfaces
- `packages/config`: validated runtime configuration
- `contracts`: Foundry Solidity marketplace contracts in a future milestone
- `docs`: architecture and operational documentation

The planned production MVP will use deterministic verification, 0G Storage for dataset and passport artifacts, and 0G Chain for registration and purchases. 0G Compute remains an optional future provider for model-based analysis.

## Local setup

```bash
npm install
cp .env.example .env
npm run typecheck
npm test
npm run lint
npm run dev -- --hostname 127.0.0.1 --port 3000
npm run api:dev
```

No secrets are committed. Mainnet deployment will be a later, explicit milestone after testnet validation.
