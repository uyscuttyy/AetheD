# AetheD

Verified data for autonomous AI.

AetheD is a trust layer for machine-readable data. It profiles uploaded datasets, records evidence-backed verification results, calculates a versioned AetheScore, produces a Data Passport, and makes verified assets discoverable and purchasable by people and AI agents.

## Current status

AetheD currently includes a tested deterministic verification engine, AetheScore methodology `1.0.0`, versioned Data Passports, PostgreSQL persistence, BullMQ workers, local and 0G Storage artifact adapters, framework-neutral API handlers, a working Next.js marketplace demo, and a local `/sell` upload-to-verification flow.

The Galileo registry/purchase contract is deployed at `0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c` on chain `16602`. A live smoke run uploaded and proof-retrieved an artifact from 0G Storage, registered its dataset/version hashes, and read the version back from the contract. The API can now reconcile confirmed purchase events into durable, exact-version access grants and requires a fresh buyer-wallet signature before returning access metadata. Browser wallet purchase, encrypted delivery, and mainnet deployment remain incomplete.

## Planned architecture

- `apps/web`: Next.js human interface
- `apps/api`: API adapter boundary; domain handlers currently live in `packages/domain`
- `packages/domain`: shared entities and business interfaces
- `packages/config`: validated runtime configuration
- `contracts`: Foundry Solidity registry/purchase contract deployed on Galileo testnet
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

No secrets are committed. Chain-enabled submissions must use the configured signer address as `sellerAddress`, because the deployed contract records `msg.sender` as the seller. Mainnet deployment remains a later, explicit milestone after testnet validation.
