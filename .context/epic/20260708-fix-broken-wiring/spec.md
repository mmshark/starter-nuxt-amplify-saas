# Epic E02 — fix-broken-wiring: Specification

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new (scope from [../../prd/roadmap.md](../../prd/roadmap.md) Phase 0 / E02; every defect re-verified against code on 2026-07-08)

## Objective

Fix the verified integration/configuration bugs — the "invisible correctness" tier. These are places
where two correct-looking pieces of code fail to connect (cookie names, unhydrated state, routes that
don't exist) or where UI pretends to do something it doesn't. Phase 0 rule: **make what exists true**.
Where the real feature belongs to a later epic, the fix here is to point at existing routes or
disable/remove the lying surface — not to build the feature.

All items below map to rows in the [tech-debt ledger](../../architecture/tech-debt.md); the fixing
commit deletes (or narrows) the corresponding row.

## Current status (verified 2026-07-08)

All nine defects are present in the code today. Each was re-verified directly (file:line), not taken
from older docs.

## In scope

| # | Ledger | Defect (verified evidence) | Phase-0 fix |
|---|---|---|---|
| 1 | BUG-01 | **Cookie name mismatch**: client writes `current-workspace-id` (`layers/workspaces/composables/useWorkspaces.ts:7,76`); server entitlements read `currentWorkspaceId` (`layers/entitlements/server/utils/getWorkspaceContext.ts:51`). The cookie fallback never matches → plan `free`/role `user` for every check without an explicit `workspaceId`. Additionally, auto-select (`useWorkspaces.ts:28-32`) and `createWorkspace` (`:62`) set state without ever persisting the cookie. | One canonical cookie name shared by both layers; persist the cookie on every selection path (auto-select, create, switch). |
| 2 | BUG-02 | **Client subscription never hydrated**: `GET /api/workspaces` maps workspaces without `subscription` (`layers/workspaces/server/api/workspaces/index.get.ts:47-57`) although the `Workspace` type declares it (`layers/workspaces/types/workspaces.ts:18`); `useEntitlements().subscriptionPlan` reads `currentWorkspace.value?.subscription?.planId` (`layers/entitlements/composables/useEntitlements.ts:35`) → always `'free'` on client/SSR. | Populate `workspace.subscription` (planId, status, currentPeriodEnd, cancelAtPeriodEnd) in `GET /api/workspaces` from `WorkspaceSubscription`, using the caller's userPool client (same authorization as the rest of the handler). |
| 3 | BUG-03 | **Broken redirect targets**: `layers/entitlements/middleware/feature.ts:33` and `requirePlan.ts:32` → `/upgrade` (no such page); `permission.ts:32` → `/dashboard` (dashboard lives at `/`); `layers/entitlements/components/UpgradePrompt.vue:34` → `/billing?plan=…` (real page is `/settings/billing`); `layers/billing/server/api/billing/checkout.post.ts:143` `cancel_url` → `${baseUrl}/pricing` (no such page). Existing pages verified: `layers/saas/pages/settings/billing.vue`, `layers/saas/pages/index.vue`. | Point every target at a route that exists today: plan/feature upsells → `/settings/billing` (query params preserved), permission denial → `/`, checkout cancel → `/settings/billing`. Building real `/upgrade` and `/pricing` pages belongs to E06/E05. |
| 4 | SEC-06 | **Email change without verification**: `layers/auth/components/UserAccountForm.vue:28-38` submits `updateAttributes({ email })` and toasts success, but no `sendUserAttributeVerificationCode`/`confirmUserAttribute` call exists anywhere in `layers/` or `apps/` (grep: 0 hits). With `loginWith: email`, this leaves an unverified address as the login identifier. `UserProfileSettings.vue:174-175` already renders email `readonly disabled` — the two forms are inconsistent. | Disable email editing in `UserAccountForm.vue` (read-only input, no mutating submit path, honest copy), consistent with `UserProfileSettings`. The verified email-change flow is E07. |
| 5 | BUG-04 | **Ghost forms** in `layers/saas/pages/profile/security.vue`: the password `UForm` (`:32-57`) has no `@submit` handler and no `updatePassword` call exists in the repo (grep: 0 hits); the "Delete account" button (`:66`) has no handler and no `deleteUser` exists. Both look functional and do nothing. | Remove the lying surfaces: replace the password form with guidance linking to the working reset flow (`/auth/forgot-password`, handlers verified in `layers/saas/pages/auth/forgot-password.vue`); remove the delete-account card or mark it explicitly "not yet implemented" with the control disabled. Real password change/account deletion is E07. |
| 6 | BUG-06 | **Seeder never creates subscriptions**: `apps/backend/amplify/seed/seeders/users.ts:341` gates on `if (user.planId && user.billingInterval)`, but no user in `apps/backend/amplify/seed/data/users.json` defines `billingInterval` (6 users define `planId`, incl. `pro`/`enterprise` with payment methods) → `createWorkspaceSubscription` is never called. | Default the interval (`month`) when `planId` is set and/or add explicit `billingInterval` to the fixture, so seeded paid users get real subscriptions. |
| 7 | BUG-07 | **Broken seed script path**: `apps/backend/package.json:19` defines `sandbox:amplify:seed: tsx scripts/amplify-seed.ts`, but `apps/backend/scripts/` does not exist; root `package.json:15` aliases it as `backend:sandbox:amplify:seed`; `apps/backend/README.md:121` documents it. The working path is `ampx sandbox seed` (`seed`, `seed:plans`, `seed:users`). | Delete the dead script, its root alias, and its doc references (incl. the stale-breakage workaround notes in `operations/environments.md` and `operations/debugging.md`). |
| 8 | BUG-08 | **`/debug` plans always empty**: `layers/debug/pages/debug/index.vue:55` reads `appConfig.billing?.plans` — the only reference to `billing.plans` in the repo; no `app.config.ts` defines it since the plans-from-Stripe migration. Plan selector and "Test Checkout" (`:103-116`) are dead. | Source plans from `GET /api/billing/plans` (exists: `layers/billing/server/api/billing/plans.get.ts`) and adapt the option/checkout mapping to its shape. |
| 9 | — (typecheck slice of BUG-09) | **Real TS errors in `layers/workspaces/server/**`** (verified by running `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck`, 341 errors total): TS18048/TS2722 unguarded `client.models.X` access in `api/workspaces/index.get.ts` (33,69 / 41,40), `[id]/invitations.get.ts` (23,40 / 48,41), `[id]/members/index.get.ts` (23,40 / 40,37); TS2307 wrong-depth relative import `../../../../types/workspaces` in `[id]/members/index.get.ts:2` (correct depth is 5 levels); TS2307 `aws-amplify/auth/server` in `server/middleware/auth.ts:2` — the same TS2307 also fires in 5 files of the auth/billing layers, i.e. it is a shared resolution root cause owned by E01. | **The guards and the import-depth fix are owned by E01** (green-ci T04/T06) — E02 does not apply them, only verifies them after E01 lands (T10). E02's only potential code change is the `aws-amplify/auth/server` TS2307 in `server/middleware/auth.ts`: if E01's module-resolution/`amplify_outputs` fix clears it repo-wide, no change; otherwise fix the import here. |
| 10 | BUG-15 | **`useEntitlements` destructures `user` from `useUser()`** (`layers/entitlements/composables/useEntitlements.ts:22`), but the composable exposes `currentUser` (no `user` key) — `user` is always `undefined` and the `subscriptionPlan`/`userRole` computeds (`:30`, `:50`) throw a TypeError for authenticated users. Latent today only because nothing consumes the gating; it detonates the moment gating is wired (E06). | Destructure `currentUser` (aliased locally). Fixed together with item 2 in T2 — AC2 cannot pass without it. |

## Out of scope

| Item | Where it belongs | Why |
|---|---|---|
| Deleting the unauthenticated demo endpoints (`apps/saas/server/api/{customers,mails,notifications}.ts`, SEC-02) and their pages | E03 template-cleanup | They are template residue removed wholesale with their pages; adding auth to files E03 deletes is churn. The roadmap E02 blurb mentions them — this spec records the split explicitly. |
| Real account management: `updatePassword`, `deleteUser` + cleanup Lambda, verified email change, avatar upload | E07 | E02 only removes/disables the lying surfaces; E07 supersedes the stopgaps. |
| Email sending of any kind (invitations, Cognito branding) | E04 | No email provider exists in the repo. |
| Creating `/pricing` and `/upgrade` pages, mounting the dead pricing components | E05 / E06 | E02 repoints redirects at existing routes only. |
| The typecheck burn-down, including the workspaces-local code defects in item 9 (import depth + `client.models.X` guards), the ~329 cascade errors (missing `amplify_outputs.json`), and CI wiring | E01 green-ci | E01 T04/T06 own the workspaces-server fixes; E02 keeps only the post-E01 verification and the conditional `aws-amplify/auth/server` check (item 9 / T10). |

## Acceptance criteria

Each criterion is objectively verifiable; commands assume repo root. Criteria marked **[sandbox]**
need a live Amplify sandbox + seeded Stripe plans (see [operations/environments.md](../../operations/environments.md)).

1. **Cookie**: the cookie name written by `useWorkspaces` equals the name read by
   `getWorkspaceContext` (single canonical name; the string appears once as a shared constant or the
   greps below return the same name on both sides). After login and workspace auto-select, the cookie
   is present without calling `switchWorkspace`.
   `grep -rn "getCookie(event" layers/entitlements/server/utils/getWorkspaceContext.ts` and
   `grep -rn "useCookie(" layers/workspaces/composables/useWorkspaces.ts` reference the same name.
2. **Hydration**: `GET /api/workspaces` response items contain a `subscription` key
   (object with `planId`/`status` for subscribed workspaces, `null` otherwise). **[sandbox]** Logged
   in as a seeded `pro` user, `useEntitlements().subscriptionPlan` resolves `'pro'` on `/debug`
   (or via a devtools check), not `'free'`. Resolving (rather than throwing) also proves the
   `user` → `currentUser` destructure fix from scope item 10.
3. **Redirects**: `grep -rn "'/upgrade'\|'/dashboard'" layers/entitlements/` → 0 hits;
   `grep -rn "baseUrl}/pricing" layers/billing/` → 0 hits; every `navigateTo`/URL target in
   `layers/entitlements/middleware/*`, `UpgradePrompt.vue`, and the checkout `success_url`/`cancel_url`
   resolves to a page that exists in `layers/saas/pages/` or `apps/saas/app/pages/`.
4. **Email form**: `grep -n "updateAttributes" layers/auth/components/UserAccountForm.vue` → 0 hits;
   the email input renders `readonly`/`disabled`; no success toast for an email "change" is reachable;
   copy on `/profile/account` does not claim email/password management it doesn't have.
5. **Ghost forms**: `layers/saas/pages/profile/security.vue` contains no `type="submit"` control
   without a wired handler and no "Delete account" action without a handler; whatever remains either
   works today (link to `/auth/forgot-password`) or is explicitly labeled not implemented and disabled.
6. **Seeder**: **[sandbox]** after `pnpm backend:sandbox:seed` (with Stripe plans seeded),
   `WorkspaceSubscription` records exist for the `pro`/`enterprise` fixture users (visible on
   `/debug/plans` or via the data client); the `users.ts` gate no longer requires a field absent from
   the fixture.
7. **Seed script**: `grep -rn "amplify-seed" package.json apps/backend/ .context/ --include='*.json' --include='*.md'`
   → 0 hits (script, root alias, README row, and stale workaround notes all gone).
8. **Debug plans**: `grep -rn "appConfig.billing" layers/debug/` → 0 hits. **[sandbox]** `/debug`
   lists the seeded plans and "Test Checkout" reaches Stripe checkout.
9. **Typecheck**: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck 2>&1 | grep "layers/workspaces/server"`
   reports no TS18048/TS2722 and no wrong-path TS2307; the only permitted residue is the shared
   `aws-amplify/auth/server` TS2307 *if and only if* E01's resolution fix has not landed yet (it also
   fires in `layers/auth` and `layers/billing`, so it cannot be fully judged inside this epic).
10. **Regression**: `pnpm test` (vitest) passes; `pnpm lint` passes on Node 22.
11. **Ledger/roadmap**: tech-debt rows BUG-01/02/03/06/07/08 deleted; SEC-06 and BUG-04 rows narrowed
    to their E07 remainder; roadmap E02 status updated on completion.

## Dependencies and coordination

- **E01 green-ci**: full typecheck verification (criterion 9) is only fully assessable once E01 stubs
  or generates `amplify_outputs.json`; the shared `aws-amplify/auth/server` TS2307 root cause is E01's.
  E02's code fixes are safe to land before E01.
- **E03 template-cleanup**: owns deletion of the mock endpoints/pages (SEC-02) and the duplicated
  shell; no file ownership overlap with E02 tasks.
- **E05/E06/E07**: build the real destinations/features this epic stopgaps; the redirect targets and
  disabled surfaces introduced here are expected to be revisited by them.
