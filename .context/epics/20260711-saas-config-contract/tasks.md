---
epic: 20260711-saas-config-contract
---

# E26 — Tasks


- [x] Add `config/` workspace package and stable exports.
- [x] Define IDs, colors, locale/currency, product, billing, entitlement, auth and shell schemas.
- [x] Implement duplicate and cross-reference validation with explicit error paths.
- [x] Export inferred `SaasConfig` and domain slice types.
- [x] Add the canonical root `saas.config.ts` using current verified starter facts.
- [x] Add tests for valid parsing and all acceptance-criterion failures.
- [x] Document the three-tier boundary: product facts / app presentation / environment secrets.
- [x] Add the package to the Taskfile type-check gate and run `task ci:all`.
- [ ] Mark E26 done only after the contract PR is merged.
