# AetheD Architecture

AetheD separates the human web interface, agent API, verification workers, indexed application state, decentralized artifacts, and on-chain commerce.

The core loop is `upload -> verify -> score -> store -> discover -> buy -> access`.

## Current

Deterministic profiling runs in replaceable stages inside the TypeScript domain package. Dataset/version/verification state and queued jobs are currently held in memory. Verification artifacts can be written to the local filesystem. The Next.js web app uses synthetic demo records rather than API data.

There is no current PostgreSQL, Redis, deployed HTTP server, 0G Storage client, 0G Compute client, or smart contract.

## Planned

PostgreSQL will store searchable projections and authorization state. 0G Storage will store dataset artifacts, manifests, verification results, and Data Passports. A 0G Chain contract will store compact identifiers, hashes, ownership, listings, and purchase records.

The initial release does not require OpenAI or another paid LLM service. Model-based AI utility analysis will be an optional adapter.
