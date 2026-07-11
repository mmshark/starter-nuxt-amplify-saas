---
epic: 20260708-fix-broken-wiring
---

# Epic E02 — fix-broken-wiring: Plan


## Approach

Five independent workstreams; only WS-A has internal ordering. Each task in
[tasks.md](./tasks.md) is one commit and deletes/narrows its
[tech-debt ledger](../../architecture/tech-debt.md) row in the same commit, so every commit leaves
both code and docs true.

| WS | Theme | Spec items | Tasks |
|---|---|---|---|
| A | Workspace context plumbing (cookie + subscription hydration) | 1, 2 | T1 → T2 |
| B | Navigation honesty (redirect targets) | 3 | T3, T4 |
| C | Lying surfaces (email form, ghost forms) | 4, 5 | T5, T6 |
| D | Dev tooling (seeder, seed script, debug plans) | 6, 7, 8 | T7, T8, T9 |
| E | Workspaces typecheck verification + auth-server residue (E01 owns the code fixes) | 9 | T10 |
| — | Closeout (roadmap status, changelog) | 11 | T11 |

## Key design decisions

### D1 — Canonical cookie name: `current-workspace-id` (server adapts to client)

The client name is what real browsers already persist; renaming the client side would silently drop
every existing user's selection. So `getWorkspaceContext.ts` changes its `getCookie` name, not the
composable. To prevent recurrence, the name becomes a shared constant exported by the workspaces
layer and imported by entitlements (the entitlements util already imports
`@mmshark/workspaces-layer/types/workspaces`; add the constant there or add an export map entry —
implementation's choice, the criterion is a single source of truth). Doc comments that name the old
cookie (`layers/entitlements/server/utils/requirePermission.ts:19`,
`layers/billing/server/api/billing/checkout.post.ts:48`, `portal.post.ts:49`,
`getWorkspaceContext.ts:41,76`) are updated in the same commit.

**Also in scope of T1**: persisting the cookie on *every* selection path. Today only
`switchWorkspace` writes it; auto-select in `loadWorkspaces` and `createWorkspace` set only
`useState`. Centralize in one `setCurrentWorkspace(id)` helper (state + cookie) used by all three
paths — otherwise the server-side fallback still sees no cookie until the user manually switches.

Rejected alternative: renaming the client cookie to `currentWorkspaceId` — loses existing sessions'
selection for zero benefit.

### D2 — Hydrate subscription server-side in `GET /api/workspaces`

Enrich the handler (`layers/workspaces/server/api/workspaces/index.get.ts`) with one
`WorkspaceSubscription.get` per returned workspace (page size ≤ 20; primary key is `workspaceId`),
mapped to the already-declared `Workspace.subscription` client type (`planId`, `status`,
`currentPeriodEnd`, `cancelAtPeriodEnd`). Authorization is unchanged: the caller's userPool client
reads `WorkspaceSubscription` via `ws:<id>:members` group claims — the exact pattern
`getWorkspaceContext.ts:115-119` already uses.

Rejected alternatives:
- Client-side hydration in `useWorkspaces` via `GET /api/billing/subscription?workspaceId=…` per
  workspace — N extra round-trips from the browser and it drags the Stripe-aware billing endpoint
  into a plain workspace listing.
- Fixing it inside `useEntitlements` — wrong layer; the data belongs to the workspace record the
  type already promises.

Note the coupling with T7: without seeded subscriptions there is nothing to hydrate in a sandbox, so
end-to-end verification of T2 happens after T7 (unit-level assertion lands with T2).

### D3 — Redirect targets: nearest existing route, never a new page

Phase 0 does not create pages. Mapping:

| Source | Old target | New target |
|---|---|---|
| `middleware/feature.ts:33` | `/upgrade?feature=…&plan=…` | `/settings/billing?feature=…&plan=…` |
| `middleware/requirePlan.ts:32` | `/upgrade?plan=…` | `/settings/billing?plan=…` |
| `middleware/permission.ts:32` | `/dashboard?error=…` | `/?error=insufficient_permissions` |
| `UpgradePrompt.vue:34` | `/billing?plan=…` | `/settings/billing?plan=…` |
| `checkout.post.ts:143` | `${baseUrl}/pricing` | `${baseUrl}/settings/billing?checkout=canceled` |

`/settings/billing` is where plan management actually lives (`layers/saas/pages/settings/billing.vue`;
checkout `success_url` already points there). Query params are preserved so E05/E06 can later re-point
the same call sites at real `/pricing`/`/upgrade` pages without changing calling conventions.

### D4 — Disable, don't build (email form, ghost forms)

- `UserAccountForm.vue`: email input becomes `readonly disabled` (mirroring
  `UserProfileSettings.vue:174-175`), the `updateAttributes({ email })` submit path and success toast
  are removed, and a hint states that email change ships with account management (E07). The page copy
  in `layers/saas/pages/profile/account.vue` ("Manage your account settings, email, and password")
  is corrected — it currently promises capabilities that do not exist.
- `profile/security.vue`: the password card keeps its title but replaces the dead form with a link to
  the *working* reset flow (`/auth/forgot-password` — verified functional); the delete-account card is
  removed (preferred: smallest lying surface) or kept with a disabled button and an explicit "Not yet
  available" label. Either satisfies the spec; removal is the default choice.

Rejected alternative: removing `/profile/security` and its nav entry entirely — the reset-flow
pointer has real user value and keeps the nav stable for E07 to fill in.

### D5 — Seeder: default interval in code, document in fixture

Change the gate at `users.ts:341` to `if (user.planId)` and pass
`user.billingInterval ?? 'month'`; additionally set `"billingInterval": "month"` explicitly on the
paid fixture users in `users.json` so the fixture is self-describing. The free-plan path inside
`createWorkspaceSubscription` (`users.ts:96-111`) already handles `free` without Stripe. Two changes,
one behavior: seeded paid users end up with `WorkspaceSubscription` records.

### D6 — Debug plans page consumes the real plans API

Replace the `appConfig.billing?.plans` computed (`debug/index.vue:55`) with data from
`GET /api/billing/plans` and adapt the mappings: options are built from
`monthlyPrice`/`yearlyPrice`/`stripeMonthlyPriceId`/`stripeYearlyPriceId` (API shape, see
`plans.get.ts:16-27`) instead of the defunct `price`/`interval`/`stripePriceId`; `testCheckout`
(`:103-116`) passes a price id that exists in the fetched plan. No new debug features.

### D7 — Typecheck: E01 owns the workspaces code fixes; E02 keeps only the auth-server check

Three genuinely-code defects exist in `layers/workspaces/server/**`:
1. Wrong-depth relative import (`[id]/members/index.get.ts:2`): `../../../../types/workspaces` →
   `../../../../../types/workspaces` (file sits 5 levels below the layer root).
2. TS18048/TS2722 unguarded `client.models.X` in the three GET handlers.
3. `aws-amplify/auth/server` TS2307 in `server/middleware/auth.ts:2` — fires identically in 5
   auth/billing files, i.e. a repo-wide resolution problem in E01's territory.

**Single-owner rule (avoids duplicate commits on the same lines)**: items 1–2 are **owned by E01**
— its T04 fixes the import depth, its T06 guards the model accessors as part of the typecheck
burn-down. E02 T10 is a post-E01 verification gate plus at most one code change: item 3, and only
if E01's `amplify_outputs`/resolution fix does not clear it repo-wide. Sequencing rule: **T10 lands
after E01 T04/T06**; if E02 must close before E01 lands, T10 records items 1–3 as pending E01 work
in the closeout — it does not fix them.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Sandbox-dependent verification (spec criteria 2, 6, 8) can't run in CI | Mark them **[sandbox]** in tasks; unit-level assertions (vitest) land with the code; run the sandbox pass once at epic close and record it in the closeout commit message. |
| T2 hydration adds N reads to a hot listing endpoint | Page size is capped at 20 (handler `limit`); reads are keyed gets, not scans. Acceptable for Phase 0; revisit if listing grows. |
| Cookie rename on the server drops nothing but the *doc comments* may drift again | Shared constant (D1) makes the name single-sourced; greps in acceptance criteria catch drift. |
| `useWorkspaces` unit test stubs `useCookie` name-agnostically (`__tests__/useWorkspaces.test.ts:25`) and would not catch a regression | Extend the test in T1 to assert the cookie is written on auto-select/switch with the canonical name. |
| E01 lands its typecheck fixes in parallel and T10 conflicts | No line overlap by design (D7): E01 owns all workspaces-server code fixes; T10 only verifies them and touches at most `server/middleware/auth.ts`. Merge order: E01 T04/T06 first, T10 after. |

## Verification strategy

- Per task: the verification commands listed in [tasks.md](./tasks.md) (greps + `pnpm test` +
  targeted typecheck) — all runnable without AWS.
- Epic close (once, with a live sandbox + seeded Stripe data): seed users → login as `test+pro1@…` →
  confirm `/api/workspaces` returns `subscription`, `/debug` shows plans, checkout cancel returns to
  `/settings/billing`, and `subscriptionPlan` resolves `pro`.
- `pnpm test` and `pnpm lint` green on Node 22 after every commit.
