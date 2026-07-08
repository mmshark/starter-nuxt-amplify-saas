# 2026-07-08 — E02 fix-broken-wiring: make what exists true

> **Status**: Historical · **Created**: 2026-07-08 · **Source**: epic [20260708-fix-broken-wiring](../epic/20260708-fix-broken-wiring/); branch `fix/remediation-2026-07-07` commits `307c70c..17c0c2f`

Epic E02 fixed the "invisible correctness" tier — places where two correct-looking
pieces of code failed to connect, or where UI pretended to do something it didn't.
Phase 0 rule: **make what exists true**. Where the real feature belongs to a later
epic, the fix here points at an existing route or disables/removes the lying surface
rather than building the feature. Nine defects (+ the latent BUG-15) closed across
nine commits; `pnpm test` (10) and `pnpm lint` (0 errors) green on Node 22 throughout.

## What landed

| # | Bug | Change |
|---|---|---|
| T1 | BUG-01 | Unified the workspace cookie name behind a shared `CURRENT_WORKSPACE_COOKIE` constant (`current-workspace-id`) imported by both `useWorkspaces` and `getWorkspaceContext`; centralized persistence in `setCurrentWorkspace(id)` so auto-select/create/switch all write the cookie the server reads. |
| T2 | BUG-02, BUG-15 | `GET /api/workspaces` now hydrates each workspace's `subscription` (keyed `WorkspaceSubscription.get`, caller's userPool session), so `useEntitlements().subscriptionPlan` resolves the real plan; fixed `useEntitlements` to destructure `currentUser` (removing E01's `@ts-expect-error`). |
| T3 | BUG-03 (UI) | Repointed gating redirects at routes that exist: feature/plan → `/settings/billing` (query preserved), permission denial → `/`, `UpgradePrompt` → `/settings/billing`. |
| T4 | BUG-03 (billing) | Stripe checkout `cancel_url` → `/settings/billing?checkout=canceled` (was `${baseUrl}/pricing`, a 404). |
| T5 | SEC-06 | Email editing in `UserAccountForm` is `readonly disabled` with honest copy; removed the `updateAttributes({ email })` submit + success toast; corrected the `/profile/account` card copy. |
| T6 | BUG-04 | Removed the ghost password form and delete-account button from `profile/security`; the page now links to the working reset flow. |
| T7 | BUG-06 | Seeder creates subscriptions whenever `planId` is set (interval defaults to `month`); paid fixture users carry an explicit `billingInterval`. |
| T8 | BUG-07 | Deleted the dead `sandbox:amplify:seed` script (`tsx scripts/amplify-seed.ts` — no such dir), its root alias, and doc references. |
| T9 | BUG-08 | `/debug` loads plans from `GET /api/billing/plans` (was the defunct `appConfig.billing.plans`); `testCheckout` passes a real Stripe price id to `createCheckoutSession`. |
| T10 | (spec item 9) | Verification gate only — E01 owned the workspaces-server type fixes. Confirmed `nuxt typecheck` is 0 errors, no `layers/workspaces/server` errors, and the `aws-amplify/auth/server` TS2307 was cleared repo-wide by E01, so **no code change was needed**. |

## Debt resolved

Ledger rows `BUG-01/02/03/06/07/08` and `BUG-15` deleted. `SEC-06` and `BUG-04`
narrowed to their **E07** remainder (real verified email change; real in-app
password change + account deletion). Removed the now-false "known issues" notes for
these bugs from `operations/{environments,debugging,make-it-yours}.md`.

## Stopgaps later epics must supersede

- **E05** (pricing-upgrade-flow): the redirect/`cancel_url` targets point at
  `/settings/billing` as a stand-in; re-point them at the real `/pricing`/`/upgrade`
  pages (query params were preserved for exactly this). Call sites are commented.
- **E06** (entitlements gating): the middleware/`UpgradePrompt` redirects are the
  other half of the same stopgap. Subscription hydration (T2) and the cookie fix
  (T1) are the data prerequisites E06 depends on.
- **E07** (account-management): supersede the disabled email field and the removed
  password/delete surfaces with real, verified flows.

## `[sandbox]` verification — DEFERRED (no live sandbox in this environment)

Spec criteria 2/6/8 need a live Amplify sandbox + seeded Stripe plans; the local
`amplify_outputs.json` is the credential-less CI stub, so these were **not run**.
Unit-level assertions landed with the code (T1/T2 cookie + subscription passthrough
in `useWorkspaces.test.ts`). To run the deferred pass:

```sh
pnpm billing:sandbox:stripe:seed && pnpm backend:sandbox:seed:plans && pnpm backend:sandbox:seed:users
# login as test+pro1@ontopix.ai → GET /api/workspaces items carry subscription.planId 'pro';
# /debug lists plans and Test Checkout reaches Stripe; checkout cancel returns to /settings/billing;
# useEntitlements().subscriptionPlan resolves 'pro'.
```

## Out of scope — tagged E02 by E01 but NOT in fix-broken-wiring's spec

E01's changelog deferred these to "E02", but this epic's spec scoped only the wiring
defects above. They remain open and need a scope decision (re-tag to a fitting epic
or a small dedicated cleanup); they are not "broken wiring":

- **BUG-16** — model-scope `allow.resource()` no longer type-checks under
  `@aws-amplify/data-schema@1.26`; E01 suppressed each line with `@ts-expect-error`.
  Durable fix (move grants to schema scope) is a backend-auth change, not wiring.
- **BUG-17** — `getPaymentMethodInfo` reads the removed `invoice.payment_intent`;
  the real fix retrieves an expanded PaymentIntent — a billing feature-fix.
- **/debug `useStripe`** — the debug page still probes a non-existent `useStripe`
  composable behind `@ts-expect-error` with a `TODO(E02)` "until E02 adds it".
  Adding a `useStripe` composable is a new feature the fix-broken-wiring spec
  explicitly excluded ("No new debug features"); the code is behavior-safe today.
