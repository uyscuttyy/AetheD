# AetheD Agent API

The API contract is implemented as framework-neutral handlers. A local Next.js adapter currently mounts dataset submission and verification lookup under `/api/v1` for the seller demo. A production API server and OpenAPI document are still planned.

## Response envelope

Successful responses use `{ "data": ... }`. Failures use:

```json
{ "error": { "code": "DATASET_NOT_FOUND", "message": "Dataset not found" } }
```

## Intended routes

- `POST /api/v1/datasets` — submit a CSV, JSON, or JSONL dataset; returns `202` and verification IDs.
- `GET /api/v1/verifications/:id` — retrieve job status, evidence, AetheScore, and Data Passport.
- `GET /api/v1/datasets/search` — search published datasets by text, category, format, and minimum score.
- `GET /api/v1/datasets/:id` — retrieve the dataset and all version-specific verification records.

Currently mounted by Next.js:

- `POST /api/v1/datasets`
- `GET /api/v1/verifications/:id`

The temporary process endpoint used by tests represents a background worker and will not be exposed publicly in production.

## Agent lifecycle

1. Search for datasets with structured filters.
2. Compare scores, confidence, component evidence, and limitations.
3. Retrieve one version-specific Data Passport.
4. Initiate purchase through the future commerce endpoint.
5. Retrieve an access grant after on-chain confirmation.
