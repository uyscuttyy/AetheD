# AetheD Architecture

AetheD separates the human web interface, agent API, verification workers, indexed application state, decentralized artifacts, and on-chain commerce.

The core loop is `upload -> verify -> score -> store -> discover -> buy -> access`.

Deterministic profiling runs in replaceable worker stages. PostgreSQL stores searchable projections and authorization state. 0G Storage stores dataset artifacts, manifests, verification results, and Data Passports. A 0G Chain contract stores compact identifiers, hashes, ownership, listings, and purchase records.

The initial release does not require OpenAI or another paid LLM service. Model-based AI utility analysis will be an optional adapter.
