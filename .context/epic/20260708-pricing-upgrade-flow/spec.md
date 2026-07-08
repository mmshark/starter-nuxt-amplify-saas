# Epic E05 — Pricing & upgrade flow

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new (facts verified against code; supersedes the `/pricing` upgrade-flow claims in `doc/prd/billing.md`)

**Objective** ([roadmap](../../prd/roadmap.md) Phase 1, E05): a free workspace can become a paying one, self-service, from inside the app. This is the starter's revenue path; today it is broken end-to-end.

Domain background (workspace-first billing, portal-first management, plan catalog synced FROM Stripe) lives in the billing PRD: [../../prd/billing.md](../../prd/billing.md). This spec only covers what E05 changes.

## Current status (verified 2026-07-08)

What already works — this epic must **not** rebuild it:

| Piece | State | Evidence |
|---|---|---|
| Checkout endpoint | Works. `POST /api/billing/checkout` validates `workspaceId`/`planId`/`billingInterval`, enforces `requirePermission(event, 'manage-billing', workspaceId)` (OWNER-only per `layers/entitlements/config/permissions.ts`), resolves the Stripe `priceId` **server-side** from `SubscriptionPlan` (client cannot inject prices), self-heals a missing Stripe customer via the `workspace-membership` Lambda (`ensureBilling`), and stamps `metadata.workspaceId` for the webhook | `layers/billing/server/api/billing/checkout.post.ts` |
| Webhook sync | Works. `stripe-webhook` Lambda (public Function URL, signature-verified) upserts `WorkspaceSubscription` — plan resolution by price id, status, period, `trialStart`/`trialEnd`, ordering guard, idempotency via `ProcessedStripeEvent`, revert-to-free on deletion | `apps/backend/amplify/functions/stripe-webhook/handler.ts` |
| Plan catalog | Works. `stripe fixtures` seeds Stripe products/prices with metadata (`app_plan_id`, `monthly_price`, `yearly_price`, `currency`, pipe-separated `features`); the plans seeder reads Stripe and upserts `SubscriptionPlan` rows | `apps/backend/amplify/seed/data/stripe.json`, `apps/backend/amplify/seed/seeders/plans.ts` |
| Public plans API | Works, unauthenticated. `GET /api/billing/plans` reads `SubscriptionPlan` via the apiKey auth mode (`allow.publicApiKey().to(['read'])` in `apps/backend/amplify/data/resource.ts`) | `layers/billing/server/api/billing/plans.get.ts` |
| Pricing components | Exist and are functional in isolation (dual-mode: autonomous fetch from `/api/billing/plans` + controlled via props; wired to `useBilling().createCheckoutSession`) | `layers/billing/components/PricingPlans.vue`, `PricingTable.vue`, `PricingPlan.vue` |
| Billing settings page | Exists at `/settings/billing`, mounts `CurrentSubscription` / `PaymentMethod` / `InvoicesList` | `layers/saas/pages/settings/billing.vue` |

What is broken or missing — the gap this epic closes:

| # | Gap | Evidence |
|---|---|---|
| G1 | The pricing components are **mounted nowhere** — dead code in every app and layer (grep: only their definitions match) | `layers/billing/components/PricingPlans.vue` et al. |
| G2 | No `/pricing` route exists anywhere (`layers/saas/pages/`, `apps/saas/app/pages/`), yet checkout sets `cancel_url: ${baseUrl}/pricing` → a user who cancels checkout lands on a **404** | `layers/billing/server/api/billing/checkout.post.ts:143` |
| G3 | A free workspace has **no path into checkout**: the only CTA on `/settings/billing` is "Change Plan" in `CurrentSubscription.vue`, which opens the Customer Portal (`portal.post.ts`, 4 flows) — the portal manages an *existing* subscription and cannot start a **first** one; for a free workspace `getSubscriptionId()` finds nothing and the user dead-ends | `layers/billing/components/CurrentSubscription.vue:148-160`, `layers/billing/server/api/billing/portal.post.ts` |
| G4 | Plan **features never reach the UI**: `SubscriptionPlan` has no `features` field (the seeder parses the `features` metadata and then drops it), `/api/billing/plans` doesn't return features, and `PricingPlans.vue` hardcodes `features: []` — pricing cards would render with empty feature lists | `apps/backend/amplify/data/resource.ts:58-70`, `apps/backend/amplify/seed/seeders/plans.ts:9-36`, `layers/billing/components/PricingPlans.vue:72` |
| G5 | Trials exist **only as data fields**: the webhook syncs `trialStart`/`trialEnd` and `subscription.get.ts` returns them, but checkout never sets `trial_period_days`, no plan carries trial metadata, and no UI shows remaining trial days (only a status badge color for `trialing` in `CurrentSubscription.vue`) | `apps/backend/amplify/functions/stripe-webhook/handler.ts:234-235`, `layers/billing/server/api/billing/checkout.post.ts` (no trial params) |
| G6 | Checkout has **no guard against double subscription**: a workspace that already has an active Stripe subscription can call `/api/billing/checkout` again and end up with two subscriptions (plan changes are supposed to go through the portal) | `layers/billing/server/api/billing/checkout.post.ts` (no existing-subscription check) |

## Scope

**In scope**
1. An in-app **plans/upgrade page** in the settings/billing area that mounts the existing `PricingPlans` component against the real seeded plans (names, prices, features, monthly/yearly toggle, current plan highlighted).
2. **Checkout entry from a free workspace**: an "Upgrade" path from `/settings/billing` to the plans page; CTA gated to callers who can actually pass the server's `requirePermission('manage-billing')` check (workspace OWNER), so non-owners don't hit a 403.
3. **Correct cancel/success URLs**: `cancel_url` points at the new plans page (no more 404); the `success_url` return to `/settings/billing?session_id=…` refreshes subscription state, tolerating webhook latency.
4. **Plan features end-to-end** (G4): persist the `features` metadata into `SubscriptionPlan`, expose it via `/api/billing/plans`, render it on the cards.
5. **Basic trial support** (G5): `trial_period_days` sourced from Stripe product metadata → `SubscriptionPlan` → passed to `stripe.checkout.sessions.create`; a remaining-days indicator in `CurrentSubscription` while `status === 'trialing'`.
6. **Checkout guard** (G6): reject checkout for a workspace with an existing active/trialing Stripe subscription; direct those users to the portal (which already handles plan changes with proration).
7. Keep `GET /api/billing/plans` **publicly readable** (no auth added) — E09's landing pricing section depends on it.

**Out of scope**
- Public landing pricing section — **E09** (`landing-site`). E05's only obligation to it is item 7 above.
- Feature/permission gating of the rest of the product, `/upgrade` destination, subscription hydration in `useWorkspaces` — **E06** (`entitlements-wiring`).
- Post-checkout realtime refresh via AppSync subscriptions — **E23**; E05 uses polling on return.
- Dunning, Stripe Tax, usage-based billing (see [../../prd/billing.md](../../prd/billing.md) Current status).

## Design decisions

| Decision | Rationale |
|---|---|
| Plans page lives at **`/settings/billing/plans`** (restructure `layers/saas/pages/settings/billing.vue` → `settings/billing/index.vue` + new `settings/billing/plans.vue`) | Keeps the upgrade flow inside the authenticated settings area next to the rest of billing; no new top-level route; `/pricing` stays reserved for the public landing page (E09) |
| Reuse `PricingPlans.vue` in autonomous mode | It already fetches `/api/billing/plans`, calls `useBilling().createCheckoutSession`, and redirects to the Stripe-hosted checkout URL — mounting it is the point of this epic, not rewriting it |
| CTA gating via `useWorkspaceMembership().isOwner` (`layers/workspaces/composables/useWorkspaceMembership.ts`), not `useEntitlements()` | Client-side entitlements currently mis-resolve (subscription never hydrated + cookie-name mismatch — E02/E06 territory); the membership role is reliable today and matches the ad-hoc pattern already used by `layers/saas/pages/settings/index.vue`. Server-side enforcement (`requirePermission`) stays the real gate |
| Features and `trial_period_days` flow **Stripe metadata → seeder → `SubscriptionPlan` → plans API → UI** | Stripe is already the single source of truth for the catalog; the metadata pipeline exists (G4 shows it's parsed then dropped) — extending it beats inventing a second catalog. Plan-feature *entitlement* semantics remain in `layers/entitlements/config/features.ts` (E06); what E05 ships is marketing copy on cards |
| Paid workspaces never enter checkout | Stripe would create a second subscription (G6). The plans page routes paid-plan changes to the portal (`subscription_update` flow, proration handled by Stripe); the API enforces the same rule with a 409 |

## Acceptance criteria

All criteria assume a seeded sandbox: `pnpm billing:sandbox:stripe:seed && pnpm backend:sandbox:seed:plans && pnpm backend:sandbox:seed:users` (test users in `apps/backend/amplify/seed/data/users.json`, e.g. `test+free1@ontopix.ai`).

1. **Plans page renders real data**: `/settings/billing/plans` shows the active seeded plans (Free, Starter, Pro, Enterprise) with name, description, monthly/yearly prices and the feature list originating from Stripe product metadata; a monthly/yearly toggle switches prices. The workspace's current plan is highlighted with a disabled "Current Plan" CTA.
2. **Free → paid upgrade works end-to-end**: signed in as `test+free1@ontopix.ai` (OWNER of a free personal workspace), clicking Pro's CTA redirects to a Stripe test-mode Checkout session whose price matches the seeded Pro price; paying with test card `4242 4242 4242 4242` returns to `/settings/billing?session_id=…`; after the `stripe listen`-forwarded webhook processes, the page shows the Pro plan with status `active` (or `trialing` if a trial is configured) without a manual re-login. `WorkspaceSubscription.planId` for the workspace is `pro`.
3. **Cancel path is not a 404**: abandoning checkout ("Back"/cancel) lands on `/settings/billing/plans`, an existing page.
4. **Permission gating**: a non-OWNER member of a shared workspace sees no active upgrade CTA (disabled with an explanatory hint or hidden); a direct `POST /api/billing/checkout` as that user still returns 403 (already enforced — must not regress, covered by `layers/entitlements/server/utils/__tests__/requirePermission.test.ts`).
5. **No double subscription**: `POST /api/billing/checkout` for a workspace whose `WorkspaceSubscription` already has an active/trialing `stripeSubscriptionId` returns 409; the plans page sends paid workspaces to the Customer Portal for plan changes instead.
6. **Basic trial**: with `trial_period_days` set in a plan's Stripe product metadata (fixture default: Pro = 14), checkout starts a trial (no immediate charge); after webhook sync, status is `trialing` and `CurrentSubscription` shows a remaining-days indicator derived from `trialEnd` (e.g. "Trial — 14 days left"). Plans without the metadata behave exactly as before.
7. **Plans API stays public**: unauthenticated `GET /api/billing/plans` returns the catalog (verified by the existing test in `apps/saas/tests/e2e/specs/layers/billing/plans.spec.js`, which must stay green).
8. **Automated coverage**: a Playwright spec drives criterion 2 using the existing checkout-filling helper (`apps/saas/tests/e2e/helpers/stripe.js`, `fillCheckoutForm`), with the stripe CLI listener as a documented prerequisite.

## E2E verification path (stripe CLI)

This is the runbook for criteria 2–6; it must also be reproduced in the epic's final verification. Full Stripe sandbox setup is in `README.md` § "Configure Stripe Integration".

```bash
# 0. Prereqs: ampx sandbox running; Stripe secrets set (README steps A–B)
# 1. Seed Stripe catalog + DynamoDB plans + test users
pnpm billing:sandbox:stripe:seed
pnpm backend:sandbox:seed:plans
pnpm backend:sandbox:seed:users

# 2. Forward Stripe events to the webhook Lambda's Function URL
#    (custom.stripeWebhookUrl in apps/backend/amplify_outputs.json)
STRIPE_WEBHOOK_URL=<custom.stripeWebhookUrl> pnpm billing:stripe:listen
#    -> set the printed whsec_... as STRIPE_WEBHOOK_SECRET and re-run
#       pnpm backend:sandbox:secrets, or forwarded events fail verification

# 3. Run the app, sign in as test+free1@ontopix.ai / TestPassword123!
pnpm saas:dev

# 4. /settings/billing -> Upgrade -> pick Pro (monthly) -> pay with 4242 4242 4242 4242
# 5. Watch the listener deliver customer.subscription.created / checkout.session.completed;
#    verify /settings/billing now shows Pro (webhook latency is seconds, page must
#    self-refresh via the session_id return handling)
# 6. Negative checks: cancel from checkout (-> /settings/billing/plans),
#    repeat checkout call for the now-paid workspace (-> 409),
#    unauthenticated GET /api/billing/plans (-> 200)
```

## Dependencies & interactions

| Epic | Interaction |
|---|---|
| E01 (green-ci) | "Verified" claims for this epic's tests require a runnable CI; not a hard blocker for local verification |
| E02 (fix-broken-wiring) | E02's Phase-0 stopgap for the `cancel_url` 404 is superseded by this epic's real plans page. The `current-workspace-id` cookie mismatch does **not** block E05 (checkout/portal pass `workspaceId` explicitly) but must not be regressed |
| E06 (entitlements-wiring) | Will replace the `isOwner` ad-hoc CTA gating with `PermissionGuard` and hydrate client-side plan state; E05 must not build anything that conflicts with that (keep gating in one place) |
| E09 (landing-site) | Consumes the public plans read (`allow.publicApiKey`) and may reuse `PricingPlans` in controlled mode; E05 keeps both viable |
| E23 (realtime) | Replaces the post-checkout polling with an AppSync subscription refresh |

## Risks

- **Webhook latency vs. success page**: the success redirect can arrive before the webhook writes `WorkspaceSubscription`; without the polling/refresh handling the user sees a stale "Free" plan and loses trust. Mitigation: explicit "activating your subscription…" state with bounded polling (criterion 2).
- **Schema change**: adding `features`/`trialPeriodDays` to `SubscriptionPlan` requires a sandbox schema deploy and a re-run of `backend:sandbox:seed:plans`; document this in the plan so stale sandboxes don't render empty cards.
- **Stripe-hosted UI drift**: the Playwright checkout helper fills Stripe's hosted page; Stripe UI changes can break selectors (`apps/saas/tests/e2e/utils/selectors.js`). Keep the API-level assertions (webhook result, 409 guard) independent of the hosted-page automation.
