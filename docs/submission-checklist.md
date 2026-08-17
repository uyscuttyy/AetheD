# Hackathon Submission Checklist

## Verified In Repository

- Public repository: `https://github.com/uyscuttyy/AetheD`
- Galileo chain ID: `16602`
- Galileo registry: `0xf13ad20A3e912978Ab683b95AAdD9832d008ae0c`
- 0G Storage and registry proof: `docs/galileo-smoke-2026-08-17.json`
- Live buyer purchase proof: `docs/galileo-purchase-2026-08-17.json`
- Browser purchase, receipt reconciliation, signed access proof, and mediated download implemented.
- Public API projections redact storage and verification-artifact references.

## Reproduction

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run contract:test
```

Live Galileo commands require a separately supplied `.env` with funded testnet credentials. Never commit `.env` or private keys.

## Still Required Before Submission

- Host the web app and API at public URLs.
- Add hosted web/API URLs and Explorer links to the submission form.
- Record a sub-three-minute demo covering verification, Galileo registration, wallet purchase, and mediated download.
- Publish the required X post and include its URL.
- Confirm whether the submission requires a mainnet contract; the current proof is Galileo testnet.
