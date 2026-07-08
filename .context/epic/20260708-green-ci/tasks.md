# Tasks — Epic E01 Green CI

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new (work queue for [plan.md](./plan.md))

Dependency-ordered. One atomic commit per task (T09 rehearsal commits nothing). Do not start a
task before its dependencies are checked off. Baseline: 341 typecheck errors, lint crashes on
Node 20, zero Actions runs — see [spec.md](./spec.md).

## Phase 1 — Module resolution

- [ ] **T01 — Commit stub outputs + gitignore exception + copy script**
  Files: `layers/amplify/amplify_outputs.stub.json` (new, fields per [design.md](./design.md)),
  `.gitignore`, `layers/amplify/.gitignore` (add `!amplify_outputs.stub.json`), root
  `package.json` (script `amplify:outputs:stub`).
  Commit: `ci: add stub amplify_outputs for credential-less CI`
  Verify: `git ls-files layers/amplify/amplify_outputs.stub.json && pnpm run amplify:outputs:stub && git check-ignore layers/amplify/amplify_outputs.json`
  Expected: stub path printed (tracked); copy succeeds; check-ignore prints the copied path (still ignored).

- [ ] **T02 — Declare missing type-level deps in the amplify layer** (deps: T01)
  Files: `layers/amplify/package.json` (devDeps `"@starter-nuxt-amplify-saas/backend": "workspace:*"`,
  `"@aws-amplify/api-graphql"` at the version `aws-amplify@6` ships), `pnpm-lock.yaml`.
  Commit: `fix(amplify-layer): declare backend schema and api-graphql type deps`
  Verify: `pnpm install && pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -cE "backend/schema|api-graphql"`
  Expected: `0`.

- [ ] **T03 — Fix saas-layer config export resolution** (deps: T01)
  Files: `layers/saas/package.json` (exports map so `@mmshark/saas-layer/config/navigation`
  resolves to `layers/saas/config/navigation.ts`); consumer `apps/saas/app/app.config.ts:1`.
  Commit: `fix(saas-layer): make config/* export resolvable by TS bundler resolution`
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -c "saas-layer/config"`
  Expected: `0`.

- [ ] **T04 — Fix short relative type imports in workspaces server routes** (deps: T01)
  Files: `layers/workspaces/server/api/workspaces/[id]/members/index.get.ts:2` (`../../../../types/workspaces`
  → 5 levels up to `layers/workspaces/types/workspaces.ts`); sweep siblings:
  `grep -rn "\.\./types/workspaces" layers/workspaces/server/`.
  Ownership: E01 owns this fix — E02 T10 only verifies it afterwards (E02 plan D7).
  Commit: `fix(workspaces-layer): correct relative paths to types/workspaces`
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -c "types/workspaces"`
  Expected: `0`.

- [x] **T05 — Checkpoint: zero TS2307, record residual count** (deps: T02, T03, T04; no commit — measurement gate)
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | tee /tmp/tc.log | grep -c TS2307; grep -c "error TS" /tmp/tc.log`
  Result (2026-07-08, Node 22): TS2307 = **0** ✓ · `residual = 107` (≈89 unique).

  **Phase 1 re-scope note**: the plan's Phase-1 table under-enumerated the module-resolution
  fixes. Beyond T02/T03/T04, the following were also required to reach TS2307 = 0 and were fixed
  in Phase 1 (commits on branch): missing `.ts`/`.vue` in the `exports` maps of the **auth**,
  **workspaces** and **entitlements** layers (same class as T03/saas); undeclared `aws-amplify`
  peer in **auth/billing/workspaces/debug**; undeclared `@nuxt/ui` peer in **auth/workspaces**;
  undeclared `zod` peer in **auth**; and the debug plans page importing a non-exported backend
  deep path (repointed to `@starter-nuxt-amplify-saas/backend/schema`).

  **Phase 2 re-scope** (residual 107 by area):
  - `apps/backend/amplify/data/resource.ts` — **12** (6 unique): `allow.resource()` "does not
    exist on BaseAllowModifier". NOT anticipated by the plan. Surfaced by T02 resolving
    `backend/schema` (previously masked behind TS2307). `data-schema@1.26` types
    `BaseAllowModifier = Omit<AllowModifier,'resource'>`; the schema uses model-level
    `allow.resource(fn)` which those types omit. Backend has **no tsconfig** → `ampx` never
    strict-typechecks it, so it deploys/works. **Decision pending** (see epic notes): boundary
    suppression (recommended, behavior-preserving) vs schema-level refactor (semantic, → E02+).
  - `layers/**` + `apps/saas/app/**` — **~95** (83 unique) mechanical, behavior-preserving type
    fixes: TS2322 (17), TS7006 implicit-any (16), TS2339 (14), TS18046 (7), TS7053 (5), TS2353 (4),
    TS2344 (4), plus long tail. Hotspots: `debug/index.vue` (11), `app.config.ts` (7),
    `billing/invoices.get.ts` (6), `debug/plans.vue` (5), `auth/useUser.ts` (5),
    `app/layouts/default.vue` (5). 3 errors live in `apps/saas/app/components/{customers,inbox,home}`
    demo files that **E03 deletes** — fix minimally or note.

## Phase 2 — Typecheck burn-down (split per area; drop any task whose area reaches 0 at T05)

- [ ] **T06 — Fix residual errors in `layers/workspaces/server/**`** (deps: T05)
  Today's symptoms: `client.models.X is possibly 'undefined'` (TS18048/TS2722) in
  `index.get.ts`, `[id]/members/index.get.ts`, `[id]/invitations.get.ts`. Guard or narrow at the
  data-client boundary; no behavior changes (functional bugs → E02).
  Ownership: E01 owns these guards — E02 T10 only verifies them afterwards (E02 plan D7).
  Commit: `fix(workspaces-layer): resolve remaining typecheck errors in server routes`
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -c "layers/workspaces"`
  Expected: `0`.

The per-area tasks below are the measured hotspots (mostly expected to be cascade). At the T05
gate, check off as already-done any whose area measures 0 (no commit), and add a sibling task for
any new area that appears — one commit per area, per the header rule.

- [ ] **T07a — Fix residual errors in `layers/billing/server/api/billing/*.ts`** (deps: T05)
  Commit: `fix(billing): resolve remaining typecheck errors`
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -c "layers/billing"`
  Expected: `0`.

- [ ] **T07b — Fix residual errors in `layers/entitlements/server/utils/getWorkspaceContext.ts`** (deps: T05)
  Commit: `fix(entitlements): resolve remaining typecheck errors`
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -c "layers/entitlements"`
  Expected: `0`.

- [ ] **T07c — Fix residual errors in `layers/debug/pages/debug/*.vue`** (deps: T05)
  Commit: `fix(debug): resolve remaining typecheck errors`
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -c "layers/debug"`
  Expected: `0`.

- [ ] **T07d — Fix residual errors in `layers/auth/**`** (deps: T05)
  Commit: `fix(auth): resolve remaining typecheck errors`
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep -c "layers/auth"`
  Expected: `0`.

- [ ] **T07e — Fix residual errors in `apps/saas/app/**`; zero-errors gate** (deps: T05, T06, T07a–T07d)
  Commit: `fix(saas): resolve remaining typecheck errors`
  Verify: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck; echo "exit=$?"`
  Expected: `exit=0`, zero `error TS` lines (spec AC4).

## Phase 3 — Node alignment

- [ ] **T08 — Declare Node ≥22 across the repo** (deps: none, parallel-safe)
  Files: root `package.json` (`engines.node: ">=22"`), `apps/saas/package.json:28`,
  `apps/landing/package.json:13` (both `>=20.19.0` → `>=22`), `.nvmrc` (new: `22`),
  `.npmrc` (new: `engine-strict=true`).
  Commit: `chore: require Node 22 (lint crashes on Node 20 via Object.groupBy)`
  Verify (on Node 22): `pnpm install && pnpm lint && pnpm test; echo "exit=$?"`
  Expected: `exit=0`; tests `3 passed (3)` / `7 passed (7)`. Optionally on Node 20:
  `pnpm install` → fails with an `engine-strict` / unsupported-engine error (fast, clear).

## Phase 4 — Workflow + rehearsal

- [ ] **T09 — Add stub step to ci.yml** (deps: T01)
  Files: `.github/workflows/ci.yml` — insert `run: pnpm run amplify:outputs:stub`
  (or plain `cp`) after checkout/setup, **before** `pnpm install` (rationale in design.md).
  Commit: `ci: provision stub amplify_outputs before install`
  Verify: `grep -n "amplify_outputs" .github/workflows/ci.yml && grep -cEi "aws-actions|secrets\." .github/workflows/ci.yml`
  Expected: stub step listed before the install line; secrets/credentials count `0` (spec AC7).

- [ ] **T10 — Clean-clone rehearsal, no AWS env** (deps: T05–T09; no commit — verification gate)
  Verify: `git clone . "$SCRATCH/clean" && cd "$SCRATCH/clean" && env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_PROFILE sh -c 'pnpm install --frozen-lockfile && pnpm run amplify:outputs:stub && pnpm lint && pnpm test && pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck && pnpm --filter @starter-nuxt-amplify-saas/saas build && pnpm --filter @starter-nuxt-amplify-saas/landing generate'`
  Expected: exits 0 end-to-end (spec AC3). Note: stub copy runs after install here (script needs
  workspace files only, `cp` has no deps) — order only matters in CI where both are fine.

- [ ] **T11 — Conditional: fix landing generate on clean checkout** (deps: T10, only if it failed there)
  Known suspect (audit BUG-10): `layers/amplify/tsconfig.json` references `./.nuxt/tsconfig.*.json`
  that no layer-level prepare step generates (layers lack the apps' `postinstall: nuxt prepare`).
  Minimal fix options: prepare step for the layer in CI, or remove the dead project references.
  Commit: `fix: make landing generate pass on a clean checkout`
  Verify: re-run T10 command.
  Expected: exits 0.

## Phase 5 — Land and verify on master

- [ ] **T12 — PR to master; first real CI run must be green** (deps: all above)
  `ci.yml` + all fixes ride the `fix/remediation-2026-07-07` branch (or a carved-out PR).
  Verify: `gh pr checks <pr-number>`
  Expected: the `CI / build` check reports `pass`.

- [ ] **T13 — Merge; verify green on master; close out docs** (deps: T12)
  Files: [../../prd/roadmap.md](../../prd/roadmap.md) (E01 status → done),
  [../../architecture/tech-debt.md](../../architecture/tech-debt.md) (delete BUG-09, BUG-14;
  amend BUG-10 to its E09 remainder), new entry in `.context/changelogs/`.
  Commit: `docs: mark E01 green-ci done`
  Verify: `git fetch origin && git ls-tree origin/master --name-only .github/workflows/ | grep ci.yml && gh run list --workflow CI --branch master --limit 1`
  Expected: `ci.yml` listed; one run `completed` / `success` (spec AC1, AC2).
