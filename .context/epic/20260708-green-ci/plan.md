# Plan — Epic E01 Green CI

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new (implements [spec.md](./spec.md); strategy decided in [design.md](./design.md))

Ordering principle: restore module resolution first (it dissolves most of the 341 errors and
reveals the true residue), then burn the residue to zero, then align the toolchain, then land the
workflow. Baseline numbers in [spec.md](./spec.md) → "Current status".

## Phase 1 — Restore module resolution without AWS

Kill every TS2307 "Cannot find module". Files:

| Change | Files |
|---|---|
| Commit stub outputs file (per [design.md](./design.md)) | `layers/amplify/amplify_outputs.stub.json` (new) |
| Un-ignore the stub | `.gitignore` (after L32 `amplify_outputs*`), `layers/amplify/.gitignore` |
| Root copy script `amplify:outputs:stub` | `package.json` |
| Declare the backend workspace pkg so `@starter-nuxt-amplify-saas/backend/schema` (exported in `apps/backend/package.json` as `./schema` → `./amplify/data/resource.ts`) resolves under pnpm strict node_modules | `layers/amplify/package.json` (devDependency `"@starter-nuxt-amplify-saas/backend": "workspace:*"`), `pnpm-lock.yaml` |
| Declare `@aws-amplify/api-graphql` where its types are imported (`layers/amplify/plugins/01.amplify.server.ts:26`) | `layers/amplify/package.json`, `pnpm-lock.yaml` |
| Fix `@mmshark/saas-layer/config/navigation` resolution — the exports map (`layers/saas/package.json`, `"./config/*": "./config/*"`) has no `.ts` extension so TS bundler resolution fails | `layers/saas/package.json` (e.g. `"./config/*": "./config/*.ts"`) — consumer: `apps/saas/app/app.config.ts:1` |
| Fix short relative import `../../../../types/workspaces` (needs 5 `../`, target is `layers/workspaces/types/workspaces.ts`) | `layers/workspaces/server/api/workspaces/[id]/members/index.get.ts:2` (grep for other occurrences of the same pattern) |

**Exit**: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -c TS2307` → `0`.
Re-measure the total; record the residual count in tasks.md before starting Phase 2.

## Phase 2 — Typecheck burn-down to zero

With resolution restored, the cascade errors (TS2339/TS18048/TS2722 from `Schema` collapsing to
`any`) should largely disappear. Fix what remains — the audit estimates ~12 real errors in
`layers/workspaces/server/**` (today: 40, mostly `client.models.X is possibly 'undefined'` in
`layers/workspaces/server/api/workspaces/index.get.ts`, `[id]/members/index.get.ts`,
`[id]/invitations.get.ts`); other current hotspots that must reach zero (real or cascade):
`layers/billing/server/api/billing/subscription.get.ts` (68),
`layers/entitlements/server/utils/getWorkspaceContext.ts` (46),
`layers/debug/pages/debug/index.vue` (11), `apps/saas/app/**` (~13).

Rules for the burn-down:
- Fix types, don't suppress: no `@ts-ignore` / `as any` unless the underlying Amplify type is
  genuinely open-ended — then a narrow, commented cast at the boundary.
- Behavior-preserving only; anything that smells like a *functional* bug goes to E02
  (fix-broken-wiring), not here.
- Ownership: **E01 is the single owner of the `layers/workspaces/server/**` type fixes** (T04
  import depth, T06 `client.models.X` guards). E02 T10 is only a downstream verification gate plus
  a possible `aws-amplify/auth/server` residue fix — see E02 plan D7; do not defer these fixes to E02.

**Exit**: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck` exits 0 (spec AC4).

## Phase 3 — Toolchain / Node alignment

`ci.yml` already pins Node 22; make the repo say the same thing so contributors don't hit the
Node 20 lint crash (`Object.groupBy`, requires Node ≥21):

| Change | Files |
|---|---|
| `"engines": { "node": ">=22" }` at root | `package.json` |
| Update app engines from `>=20.19.0` to `>=22` (matches the Node 22 override documented for Amplify Hosting in `README.md`) | `apps/saas/package.json:27-29`, `apps/landing/package.json:12-14` |
| `.nvmrc` with `22` | `.nvmrc` (new) |
| `engine-strict=true` so `pnpm install` fails fast on Node <22 instead of crashing mid-lint | `.npmrc` (new) |

**Exit**: on Node 22, `pnpm lint` exits 0; on Node 20, `pnpm install` refuses with an engines error.

## Phase 4 — CI workflow + clean-checkout rehearsal

- Add the stub copy step to `.github/workflows/ci.yml` **before** `pnpm install`
  (see design.md, "Copy step placement"). Keep: lint, test, saas typecheck, saas build,
  landing generate — all on Node 22, no secrets (spec AC7).
- Rehearse the exact pipeline in a scratch clone (`git clone . <scratchpad>/clean`) with AWS env
  vars unset. This is where audit item BUG-10 gets re-verified: if
  `pnpm --filter @starter-nuxt-amplify-saas/landing generate` still fails on
  `layers/amplify/tsconfig.json` referencing not-yet-generated `./.nuxt/tsconfig.*.json`
  (layers have no `postinstall: nuxt prepare` — only `apps/saas` and `apps/landing` do), fix it
  minimally (e.g. a layer prepare step in CI, or drop the dead project references) as a
  conditional task.

**Exit**: full pipeline green in the scratch clone (spec AC3).

## Phase 5 — Land on master and verify

- `ci.yml` and all fixes currently live on `fix/remediation-2026-07-07`. Open the PR to `master`;
  the `pull_request` trigger gives the workflow its first real run — it must be green before merge.
- Merge; the `push: branches: [master]` trigger produces the first green run on `master`
  (spec AC1, AC2).
- Close out: update E01 status in [../../prd/roadmap.md](../../prd/roadmap.md), delete rows
  BUG-09/BUG-14 (and BUG-10's CI half) from
  [../../architecture/tech-debt.md](../../architecture/tech-debt.md), add a
  `.context/changelogs/` entry.

## Risks

| Risk | Mitigation |
|---|---|
| `apps/saas` `nuxt build` hits errors typecheck didn't surface (Vite/Nitro-specific) | build is part of every phase-4 rehearsal, not discovered at PR time |
| Cascade estimate wrong — residue much larger than ~12 | Phase 1 exit includes re-measuring and re-scoping before burn-down starts |
| Stub drifts from outputs schema as backend grows | acceptable by design — typecheck/build fail loudly; see design.md "Consequences" |
| `landing generate` prerender executes Amplify server plugin against stub values | stub is structurally valid (design constraint 2); landing has no pages doing data fetches today (renders `NuxtWelcome`) |
