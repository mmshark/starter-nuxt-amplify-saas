---
epic: 20260708-fix-broken-wiring
---

# Epic E02 — fix-broken-wiring: Tasks


Rules: one task = one commit ([Conventional Commits](../../patterns/git-conventions.md)). Each task
updates the [tech-debt ledger](../../architecture/tech-debt.md) in the same commit (delete the row
when fully fixed; narrow it when only the E02 stopgap portion is done). Verification commands run
from the repo root; **[sandbox]** steps need a live Amplify sandbox with Stripe plans seeded and are
deferred to T11 if no sandbox is available at task time.

Dependency order: T1 → T2; T3–T9 independent (any order); T10 after E01's T04/T06 land — E01 owns
the workspaces-server type fixes, T10 only verifies and handles auth-server residue (see plan D7);
T11 last.

---

## T1 — Unify the workspace cookie and persist it on every selection path

**Fixes**: BUG-01 (spec item 1). **Commit**: `fix(workspaces): unify workspace cookie name across layers and persist selection`

- [x] Introduce a single canonical cookie name `current-workspace-id` as an exported constant in
      `layers/workspaces` (importable by entitlements — the util already imports
      `@mmshark/workspaces-layer/types/workspaces`; extend `layers/workspaces/package.json` `exports`
      if the constant lives outside `types/`).
- [x] `layers/entitlements/server/utils/getWorkspaceContext.ts:51` — read the canonical name.
- [x] `layers/workspaces/composables/useWorkspaces.ts` — add a `setCurrentWorkspace(id)` helper that
      sets both `useState` and the cookie; use it in auto-select (`:28-32`), `createWorkspace`
      (`:62`), and `switchWorkspace` (`:72-79`, removing the duplicated `useCookie` at `:76`).
- [x] Update the doc comments naming the old cookie: `getWorkspaceContext.ts:41,76`,
      `layers/entitlements/server/utils/requirePermission.ts:19`,
      `layers/billing/server/api/billing/checkout.post.ts:48`, `portal.post.ts:49`.
- [x] Extend `layers/workspaces/composables/__tests__/useWorkspaces.test.ts` to assert the cookie is
      written with the canonical name on auto-select and switch.
- [x] Ledger: delete row BUG-01.

**Verify**:
```sh
grep -rn "currentWorkspaceId'" layers/*/server            # 0 cookie-name hits (state key in composables is fine)
grep -n "useCookie(" layers/workspaces/composables/useWorkspaces.ts
grep -n "getCookie(event" layers/entitlements/server/utils/getWorkspaceContext.ts   # same name as above
pnpm test
```

## T2 — Hydrate `workspace.subscription` in `GET /api/workspaces`

**Fixes**: BUG-02 and BUG-15 (spec items 2 and 10). **Commit**: `fix(workspaces): include subscription in workspace listing response`
**Depends on**: T1 (same files/area; avoids conflicting edits).

- [x] `layers/workspaces/server/api/workspaces/index.get.ts` — after mapping workspaces (`:47-57`),
      fetch `WorkspaceSubscription` per workspace id with the caller's userPool client
      (`selectionSet: ['workspaceId','planId','status','currentPeriodEnd','cancelAtPeriodEnd']`,
      same pattern as `layers/entitlements/server/utils/getWorkspaceContext.ts:115-119`) and set
      `subscription` (object or `null`) on each item, matching
      `layers/workspaces/types/workspaces.ts:3-8`.
- [x] Extend `layers/workspaces/composables/__tests__/useWorkspaces.test.ts`: a workspace envelope
      carrying `subscription` passes it through to state (guards `useEntitlements`' read at
      `layers/entitlements/composables/useEntitlements.ts:35`).
- [x] `layers/entitlements/composables/useEntitlements.ts:22` — destructure `currentUser` from
      `useUser()` (aliased to the local name) instead of the nonexistent `user` key; without this
      the `subscriptionPlan`/`userRole` computeds (`:30`, `:50`) throw for authenticated users
      (BUG-15, spec item 10).
- [x] Ledger: delete rows BUG-02 and BUG-15.

**Verify**:
```sh
pnpm test
grep -n "subscription" layers/workspaces/server/api/workspaces/index.get.ts   # mapped in response
# [sandbox] login as test+pro1@ontopix.ai → GET /api/workspaces items carry subscription.planId 'pro'
# (requires T7 seeded subscriptions); /debug shows subscriptionPlan 'pro'
```

## T3 — Point entitlements redirects at routes that exist

**Fixes**: BUG-03, entitlements half (spec item 3). **Commit**: `fix(entitlements): redirect gating flows to existing routes`

- [x] `layers/entitlements/middleware/feature.ts:33` — `/upgrade` → `/settings/billing` (keep
      `feature`/`plan` query).
- [x] `layers/entitlements/middleware/requirePlan.ts:32` — `/upgrade` → `/settings/billing` (keep
      `plan` query).
- [x] `layers/entitlements/middleware/permission.ts:32` — `/dashboard` → `/` (keep
      `error=insufficient_permissions` query).
- [x] `layers/entitlements/components/UpgradePrompt.vue:34` — `/billing?plan=…` →
      `/settings/billing?plan=…`.
- [x] Ledger: narrow row BUG-03 to the checkout `cancel_url` part (deleted fully by T4; whichever of
      T3/T4 lands second deletes the row).

**Verify**:
```sh
grep -rn "'/upgrade'\|'/dashboard'\|'/billing?" layers/entitlements/   # 0 hits
ls layers/saas/pages/settings/billing.vue layers/saas/pages/index.vue  # targets exist
```

## T4 — Fix Stripe checkout `cancel_url`

**Fixes**: BUG-03, billing half (spec item 3). **Commit**: `fix(billing): point checkout cancel_url at an existing route`

- [x] `layers/billing/server/api/billing/checkout.post.ts:143` — `${baseUrl}/pricing` →
      `${baseUrl}/settings/billing?checkout=canceled` (`success_url` at `:142` already targets
      `/settings/billing`). Leave a one-line comment that E05 re-points this at the real `/pricing`.
- [x] Ledger: delete row BUG-03 (if T3 already landed; otherwise narrow).

**Verify**:
```sh
grep -rn "baseUrl}/pricing" layers/billing/    # 0 hits
# [sandbox] start a test checkout from /debug, hit "back/cancel" → lands on /settings/billing
```

## T5 — Disable email editing in the account form

**Fixes**: SEC-06 stopgap (spec item 4). **Commit**: `fix(auth): disable unverified email editing in UserAccountForm`

- [x] `layers/auth/components/UserAccountForm.vue` — make the email input `readonly disabled`
      (mirror `UserProfileSettings.vue:174-175`); remove the `updateAttributes({ email })` submit
      path (`:28-32`) and its success toast (`:34-38`); remove or repurpose the "Save Changes"
      button; add copy stating email change ships with account management (E07).
- [x] `layers/saas/pages/profile/account.vue` — correct the card description ("Manage your account
      settings, email, and password" promises what doesn't exist).
- [x] Ledger: update row SEC-06 — stopgap applied, E07 remainder (verified change flow) stays.

**Verify**:
```sh
grep -n "updateAttributes" layers/auth/components/UserAccountForm.vue   # 0 hits
grep -n "readonly" layers/auth/components/UserAccountForm.vue           # present on email input
pnpm test
```

## T6 — Remove the ghost forms from the security page

**Fixes**: BUG-04 stopgap (spec item 5). **Commit**: `fix(saas): remove non-functional password and delete-account forms`

- [x] `layers/saas/pages/profile/security.vue` — replace the handler-less password `UForm` (`:32-57`)
      with guidance + link to the working reset flow (`/auth/forgot-password`); drop the unused
      zod schema/state.
- [x] Remove the delete-account card (`:60-68`) — or keep it with the button disabled and an explicit
      "Not yet available" label (removal preferred, see plan D4).
- [x] Ledger: update row BUG-04 — lying surface removed, E07 remainder (real password change +
      account deletion) stays.

**Verify**:
```sh
grep -n 'type="submit"' layers/saas/pages/profile/security.vue     # 0 hits (or the control has a wired handler)
grep -n "Delete account" layers/saas/pages/profile/security.vue    # 0 hits, or accompanied by disabled + not-implemented label
grep -rn "forgot-password" layers/saas/pages/profile/security.vue  # link present
```

## T7 — Seed subscriptions for fixture users

**Fixes**: BUG-06 (spec item 6). **Commit**: `fix(amplify): seed workspace subscriptions for fixture users`

- [x] `apps/backend/amplify/seed/seeders/users.ts:341` — gate on `if (user.planId)` and pass
      `user.billingInterval ?? 'month'` to `createWorkspaceSubscription` (signature at `:65`).
- [x] `apps/backend/amplify/seed/data/users.json` — add explicit `"billingInterval": "month"` to the
      four paid users (`pro`/`enterprise`), keeping the fixture self-describing.
- [x] Ledger: delete row BUG-06.

**Verify**:
```sh
grep -n "billingInterval" apps/backend/amplify/seed/seeders/users.ts apps/backend/amplify/seed/data/users.json
# [sandbox] pnpm billing:sandbox:stripe:seed && pnpm backend:sandbox:seed:plans && pnpm backend:sandbox:seed:users
#           → WorkspaceSubscription rows exist for test+pro*/test+enterprise* (check /debug/plans or data client)
```

## T8 — Delete the broken seed script and its references

**Fixes**: BUG-07 (spec item 7). **Commit**: `chore(amplify): remove dead sandbox:amplify:seed script`

- [x] `apps/backend/package.json:19` — remove `sandbox:amplify:seed`.
- [x] Root `package.json:15` — remove `backend:sandbox:amplify:seed`.
- [x] `apps/backend/README.md:121` — remove the script's row.
- [x] `.context/operations/environments.md:90` and `.context/operations/debugging.md:19` — remove the
      now-obsolete "broken seed script" workaround notes.
- [x] Ledger: delete row BUG-07.

**Verify**:
```sh
grep -rn "amplify-seed\|sandbox:amplify:seed" package.json apps/backend .context 2>/dev/null | grep -v node_modules   # 0 hits
pnpm backend:sandbox:seed --help >/dev/null 2>&1 || true   # remaining seed entry points still defined:
grep -n '"seed' apps/backend/package.json
```

## T9 — Debug page reads plans from the billing API

**Fixes**: BUG-08 (spec item 8). **Commit**: `fix(debug): load plans from /api/billing/plans instead of appConfig`

- [x] `layers/debug/pages/debug/index.vue:55` — replace the `appConfig.billing?.plans` computed with
      data fetched from `GET /api/billing/plans`; adapt `planOptions` (`:57-63`) and `testCheckout`
      (`:103-116`) to the API shape (`monthlyPrice`/`yearlyPrice`, `stripeMonthlyPriceId`/
      `stripeYearlyPriceId` — see `layers/billing/server/api/billing/plans.get.ts:16-27`).
- [x] Drop the now-unused `appConfig` billing references (keep other `useAppConfig` uses if any).
- [x] Ledger: delete row BUG-08.

**Verify**:
```sh
grep -rn "appConfig.billing" layers/debug/   # 0 hits
# [sandbox] pnpm saas:dev → /debug lists seeded plans; "Test Checkout" opens Stripe checkout
```

## T10 — Verify workspaces server typecheck after E01; fix only auth-server residue

**Fixes**: spec item 9 (coordination slice; see plan D7). **Commit**: `fix(workspaces): resolve auth-server import type error` — only if the auth-server residue below needs a code change; otherwise this is a no-commit verification gate.
**Depends on**: E01 T04 (relative-import depth in `[id]/members/index.get.ts:2`) and E01 T06
(TS18048/TS2722 `client.models.X` guards in the three GET handlers) landing first. **E01 owns those
fixes — T10 must not re-apply them** (executed twice they produce duplicate/conflicting commits on
the same lines).

- [x] Verify E01's fixes cleared `layers/workspaces/server/**` (grep below → 0 lines).
- [x] `server/middleware/auth.ts:2` — only if the `aws-amplify/auth/server` TS2307 survives E01's fix
      (it also fires in `layers/auth/server/utils/auth.ts` and 4 billing routes — a shared root
      cause), fix the import/types here; otherwise no change.
- [x] Ledger: no dedicated row (BUG-09 is E01's); record the verification outcome in the T11
      closeout commit body.

**Verify**:
```sh
pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep "layers/workspaces/server"
# → 0 lines once E01 has landed; before that, at most the shared aws-amplify/auth/server TS2307
pnpm test
```

## T11 — Epic closeout: sandbox verification pass, roadmap + changelog

**Fixes**: spec criteria 2/6/8 **[sandbox]** runs, criterion 11. **Commit**: `docs: close epic fix-broken-wiring (E02)`

- [x] Run the deferred **[sandbox]** verifications (T2, T4, T7, T9) against a live sandbox with
      seeded Stripe plans; record results in the commit body.
- [x] `.context/roadmaps/20260711-saas-boilerplate-productization.md` — set E02 status to `done`.
- [x] Add `.context/changelogs/<date>-fix-broken-wiring.md` summarizing what was fixed and which
      stopgaps E07/E05/E06 must supersede.
- [x] Confirm ledger state: BUG-01/02/03/06/07/08 rows gone; SEC-06/BUG-04 narrowed to E07 remainder.

**Verify**:
```sh
grep -n "E02" .context/roadmaps/20260711-saas-boilerplate-productization.md                       # status done
grep -n "BUG-0[123678]" .context/architecture/tech-debt.md  # only narrowed rows (if any) remain
pnpm test && pnpm lint
```
