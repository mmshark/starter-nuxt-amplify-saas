# E26 — Implementation plan

> **Status**: Specified · **Created**: 2026-07-11

## Phase 1 — Package boundary

Add `config/` to the workspace, define package exports and establish public types. Verify imports
from root, backend and a Nuxt workspace with TypeScript.

## Phase 2 — Schema and invariants

Implement leaf schemas, `defineSaasConfig()` and cross-field checks. Keep errors path-specific and
avoid framework imports.

## Phase 3 — Canonical manifest

Create root `saas.config.ts` reflecting the current starter product and Stripe catalog without
changing existing consumers. Document which values are product facts versus presentation or secrets.

## Phase 4 — Tests and contract verification

Test valid parsing, individual constraints and cross-references. Run `task test:unit`,
`task lint:all` and `task ci:all`; verify no generated bundle or runtime behavior changes.

## Rollback

Remove the additive workspace package and root manifest. Since E26 has no runtime consumers, rollback
does not require data or deployment changes.
