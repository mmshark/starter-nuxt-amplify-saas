---
epic: 20260711-saas-config-contract
---

# E26 — Tasks


- [ ] Add `config/` workspace package and stable exports.
- [ ] Define IDs, colors, locale/currency, product, billing, entitlement, auth and shell schemas.
- [ ] Implement duplicate and cross-reference validation with explicit error paths.
- [ ] Export inferred `SaasConfig` and domain slice types.
- [ ] Add the canonical root `saas.config.ts` using current verified starter facts.
- [ ] Add tests for valid parsing and all acceptance-criterion failures.
- [ ] Document the three-tier boundary: product facts / app presentation / environment secrets.
- [ ] Run `task ci:all` and record verification in the PR.
- [ ] Mark E26 done only after the contract PR is merged.
