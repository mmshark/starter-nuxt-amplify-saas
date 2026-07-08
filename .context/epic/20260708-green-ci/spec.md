# Epic E01 — Green CI

> **Status**: Done (2026-07-08; local ACs verified — AC1/AC2 on merge) · **Created**: 2026-07-08 · **Source**: new (roadmap E01; audit debt items BUG-09, BUG-10, BUG-14 in [../../architecture/tech-debt.md](../../architecture/tech-debt.md))

## Goal

CI is executable and green on `master`: `pnpm install`, lint, unit tests, typecheck, `apps/saas`
build and `apps/landing` generate all pass on a clean checkout, in GitHub Actions, **without AWS
credentials**. This is the gate every other epic depends on — no epic can claim "verified" until
its changes pass a CI that actually runs (see Phase 0 in [../../prd/roadmap.md](../../prd/roadmap.md)).

## Current status (verified 2026-07-08)

Nothing in this epic is done yet. Baseline, re-verified against the repo (not taken from old docs):

| Fact | Evidence |
|---|---|
| `.github/workflows/ci.yml` exists **only on branch `fix/remediation-2026-07-07`**, not on `origin/master` | `git ls-tree origin/master --name-only .github/workflows/` returns only `publish-layers.yml`, `publish-on-tag.yml` |
| GitHub Actions has **zero runs ever** | `gh run list --limit 5` returns empty |
| `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck` fails with **341 TS errors** | re-run 2026-07-08; exit 1 |
| Root cause of most errors: `amplify_outputs.json` is gitignored (root `.gitignore:32`, `apps/backend/.gitignore:4`, `layers/amplify/.gitignore`) but **statically imported** by `layers/amplify/plugins/01.amplify.client.ts:5`, `layers/amplify/plugins/01.amplify.server.ts:28`, `layers/amplify/server/utils/amplify.ts:14` | TS2307 ×52 incl. `Cannot find module '../amplify_outputs.json'`; cascades into TS2339/TS18048/TS2722 |
| Additional unresolved modules: `@starter-nuxt-amplify-saas/backend/schema` (no package depends on the backend workspace pkg), `@aws-amplify/api-graphql` (undeclared in `layers/amplify/package.json`), `@mmshark/saas-layer/config/navigation` (exports map lacks extension), `../../../../types/workspaces` (path one level short) | TS2307 entries in typecheck output |
| Real (non-cascade) errors exist too: `layers/workspaces/server/**` shows 40 errors today; audit estimate is **~12 survive** once module resolution is fixed (exact count re-measured in plan Phase 2) | typecheck log; [../../architecture/tech-debt.md](../../architecture/tech-debt.md) BUG-09 |
| `pnpm lint` **crashes on Node 20** (`TypeError: Object.groupBy is not a function` in `eslint-flat-config-utils@3.2.0`); `Object.groupBy` requires Node ≥21, so the Node 22 pinned in `ci.yml` is fine — but `apps/saas/package.json` declares `engines.node: ">=20.19.0"` and the root `package.json` declares no engines at all | reproduced on Node v20.20.2, 2026-07-08 |
| Unit tests pass: 3 files / 7 tests (`layers/workspaces/composables/__tests__/useWorkspaces.test.ts`, `layers/billing/composables/__tests__/formatPrice.test.ts`, `layers/entitlements/server/utils/__tests__/requirePermission.test.ts`) | `pnpm test` → `Test Files 3 passed`, `Tests 7 passed` |
| `apps/landing` generate fails on a clean checkout (audit BUG-10: `layers/amplify/tsconfig.json` references `./.nuxt/tsconfig.app.json`, which only exists after a prepare step; then the missing `amplify_outputs.json`) | to re-verify in a scratch clone (plan Phase 4) |

## Non-goals

- **E2E tests in CI** — the Playwright suite requires a live Amplify sandbox, Stripe account and
  Gmail IMAP credentials. Out of scope; E11 (testing-hardening).
- **Coverage gates / new unit tests** — E11. This epic only keeps the existing 7 tests green.
- **Preview environments, deploy automation, Amplify Hosting changes** — deferred (see cicd audit gaps).
- **Fixing the `apps/landing/amplify.yml` SSR-vs-SSG contradiction** — E09. E01 only needs
  `pnpm --filter @starter-nuxt-amplify-saas/landing generate` to pass in CI.
- **Architecturally decoupling Amplify config from a static JSON import** (runtime-config option) —
  evaluated and deliberately deferred in [design.md](./design.md).
- **AWS credentials in the default CI job** — explicitly excluded by design.

## Acceptance criteria

Each criterion has a verification command; the epic is done only when all pass.

| # | Criterion | Verification | Expected |
|---|---|---|---|
| AC1 | `ci.yml` exists on `master` | `git fetch origin && git ls-tree origin/master --name-only .github/workflows/` | list includes `ci.yml` |
| AC2 | A green CI run exists on `master` | `gh run list --workflow CI --branch master --limit 1` | one row, `completed` / `success` |
| AC3 | Full pipeline passes on a clean clone with no AWS credentials | scratch clone; `env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_PROFILE` then: `pnpm install --frozen-lockfile && pnpm run amplify:outputs:stub && pnpm lint && pnpm test && pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck && pnpm --filter @starter-nuxt-amplify-saas/saas build && pnpm --filter @starter-nuxt-amplify-saas/landing generate` (Node 22) | every command exits 0 |
| AC4 | Typecheck debt burned down: 0 errors (baseline: 341) | `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck; echo $?` | `0`, no `error TS` lines |
| AC5 | No unit-test regression | `pnpm test` | `Test Files 3 passed`, `Tests 7 passed` (or more) |
| AC6 | Node range is declared and matches what the toolchain needs | `cat .nvmrc` and `node -e "console.log(require('./package.json').engines.node)"` | `22` / `>=22` |
| AC7 | Default CI job uses no AWS credentials or repo secrets | `grep -Ei "aws-actions|configure-aws-credentials|secrets\." .github/workflows/ci.yml` | no matches |
| AC8 | Real outputs file stays out of git | `git check-ignore layers/amplify/amplify_outputs.json` | prints the path (still ignored) |

## Dependencies

Depends on: nothing. Blocks: E02, E03 and every later epic (roadmap Phase 0 exit criterion #1).
