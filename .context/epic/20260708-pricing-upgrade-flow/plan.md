# Epic E05 — Pricing & upgrade flow: implementation plan

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new (derived from [spec.md](./spec.md))

Phases are dependency-ordered; each ends with a verifiable state. Gap ids (G1–G6) refer to [spec.md](./spec.md) § Current status.

## Phase 1 — Catalog data: features + trial through the pipeline (G4, G5-data)

Extend the existing Stripe-metadata → seeder → `SubscriptionPlan` → plans-API pipeline with the two fields the UI needs. No new source of truth.

| File | Change |
|---|---|
| `apps/backend/amplify/data/resource.ts` | Add `features: a.string().array()` and `trialPeriodDays: a.integer()` to `subscriptionPlanModel`. No auth changes — keep `allow.publicApiKey().to(['read'])` + `allow.authenticated().to(['read'])` exactly as-is (spec item 7) |
| `apps/backend/amplify/seed/data/stripe.json` | Add `"trial_period_days": "14"` to the Pro product's metadata (fixture default; Free/Starter/Enterprise unchanged). `features` metadata already present on all four products |
| `apps/backend/amplify/seed/seeders/plans.ts` | Stop dropping parsed metadata: include `features` (already parsed by `extractPlanMetadata`/`parseFeatures`) and `trialPeriodDays` (new: `parseInt(metadata.trial_period_days)`, omit when absent/NaN) in the object passed to `SubscriptionPlan.create/update` |
| `layers/billing/server/api/billing/plans.get.ts` | Add `features` and `trialPeriodDays` to the transformed plan payload |

**Verify**: redeploy sandbox schema, re-run `pnpm billing:sandbox:stripe:seed && pnpm backend:sandbox:seed:plans`; `curl -s localhost:3000/api/billing/plans | jq '.data.plans[] | {id, features, trialPeriodDays}'` shows features arrays for all plans and `trialPeriodDays: 14` for `pro`. Existing e2e `apps/saas/tests/e2e/specs/layers/billing/plans.spec.js` stays green.

## Phase 2 — Mount the plans page (G1, G3-entry)

| File | Change |
|---|---|
| `layers/saas/pages/settings/billing.vue` → `layers/saas/pages/settings/billing/index.vue` | Move (route stays `/settings/billing`). Pass an `#actions` slot to `CurrentSubscription`: for a free-plan workspace render an **Upgrade** button linking to `/settings/billing/plans` (the portal cannot start a first subscription — G3); keep the portal-backed "Change Plan" default for paid workspaces. Gate the Upgrade CTA with `isOwner` from `useWorkspaceMembership()` (`layers/workspaces/composables/useWorkspaceMembership.ts`); non-owners get a disabled button with a "workspace owner only" tooltip |
| `layers/saas/pages/settings/billing/plans.vue` (new) | Mounts `<PricingPlans>` (autonomous mode — it already fetches `/api/billing/plans` and drives checkout via `useBilling().createCheckoutSession`), plus: monthly/yearly interval toggle bound to the component's `interval` prop, `selectedPlanId` = current `useBilling().currentPlanId`, and the same `isOwner` gating (non-owners see the catalog read-only) |
| `layers/billing/components/PricingPlans.vue` | Map real features onto the cards (replace the hardcoded `features: []` with the API's `features`); surface a trial badge ("14-day free trial") on plans with `trialPeriodDays`. Route paid→paid plan selection to the portal: when the caller's workspace already has a paid subscription, the CTA calls `useBilling().updateSubscription()` (portal `subscription_update`) instead of checkout — mirrors the Phase 3 server guard |
| `layers/saas/config/navigation.ts` | Add a `Plans` child under the Settings sidebar's Billing area (or keep it reachable only via the Upgrade CTA — decide at implementation; nav entry preferred for discoverability) |

**Verify**: as `test+free1@ontopix.ai`, `/settings/billing` shows Upgrade → `/settings/billing/plans` renders 4 seeded plans with features + prices, Free highlighted as current; as `test+pro1@ontopix.ai`, selecting another plan opens the portal, not checkout; as a non-owner member of a shared workspace, CTAs are inert.

## Phase 3 — Checkout hardening: URLs, trial, double-subscription guard (G2, G5, G6)

All in `layers/billing/server/api/billing/checkout.post.ts`:

1. **`cancel_url`**: `${baseUrl}/pricing` → `${baseUrl}/settings/billing/plans` (kills the 404, G2). If E02's stopgap already re-pointed it, re-point to the now-real page.
2. **Trial**: after the server-side plan lookup, when `plan.trialPeriodDays > 0` add `subscription_data.trial_period_days: plan.trialPeriodDays` to `stripe.checkout.sessions.create`. Metadata-driven only — no client-supplied trial input.
3. **Guard (G6)**: before creating the session, if the workspace's `WorkspaceSubscription` (already fetched for `stripeCustomerId`) has a `stripeSubscriptionId` and status `active`/`trialing`/`past_due`, throw 409 `Workspace already has a subscription — use the billing portal to change plans`.

Client-side return handling in `layers/saas/pages/settings/billing/index.vue`:

4. **Success return**: when `session_id` is present in the query (`success_url` already emits it), show an "activating your subscription…" state and poll `useBilling().refreshSubscription()` (e.g. every 2s, ≤30s) until `currentPlanId` leaves `free` or timeout (webhook latency, spec § Risks); then clear the query param.

**Verify**: run the spec's stripe-CLI runbook (spec § E2E verification path) end-to-end — upgrade `test+free1@ontopix.ai` to Pro monthly with `4242…`; confirm `trialing` status + no immediate charge (Pro has the trial fixture), cancel path lands on the plans page, and a second `POST /api/billing/checkout` for the same workspace returns 409.

## Phase 4 — Trial visibility (G5-UI)

| File | Change |
|---|---|
| `layers/billing/components/CurrentSubscription.vue` | When `status === 'trialing'` and `trialEnd` is in the future, render a remaining-days indicator ("Trial — N days left, converts on <date>"). Requires the component's `effectiveSubscription` mapping to carry `trialEnd` from `useBilling().subscription` (the API already returns it — `layers/billing/server/api/billing/subscription.get.ts:151-152`); extend the local `Subscription` interface + controlled-mode props accordingly |
| `layers/billing/i18n/locales/en/billing.json`, `layers/billing/i18n/locales/es/billing.json` | Add the trial strings with en/es key parity (repo convention), even though the UI is not yet consuming i18n (E13) — keeps the catalogs in sync |

**Verify**: with the Phase 3 trial subscription active, `/settings/billing` shows the badge and correct day count; a non-trial subscription (Starter, no trial metadata) shows none.

## Phase 5 — Automated tests + docs

| File | Change |
|---|---|
| `apps/saas/tests/e2e/specs/layers/billing/upgrade.spec.js` (new) | Playwright spec for spec-criterion 2: login as seeded free user (`apps/saas/tests/e2e/helpers/auth.js`), navigate to plans page, start Pro checkout, fill Stripe's hosted page via `StripeHelpers.fillCheckoutForm` (`apps/saas/tests/e2e/helpers/stripe.js` — helper already exists), assert return to `/settings/billing` and eventual Pro display. Mark the spec as requiring the stripe CLI listener (document prerequisite in the spec header comment, same style as `plans.spec.js`); keep API-level assertions (409 guard, unauthenticated plans GET) in a listener-independent test |
| `layers/billing/README.md` | Document the plans page, trial metadata (`trial_period_days`), and the checkout 409 guard; remove/adjust any wording implying a public `/pricing` route |
| `../../prd/billing.md` | Flip the affected "Current status" rows (upgrade flow, trials) once verified — per the [roadmap](../../prd/roadmap.md) maintenance rules, docs must not lead the code |
| `../../prd/roadmap.md` | Set E05 status → `done` after criteria 1–8 verified |

**Verify**: full runbook from spec § E2E verification path executed once, all 8 acceptance criteria checked off; `plans.spec.js` + new spec green locally against the seeded sandbox.

## Sequencing & effort

| Phase | Depends on | Effort |
|---|---|---|
| 1 — catalog data | sandbox available | S |
| 2 — plans page | 1 (features/trial in API) | M |
| 3 — checkout hardening | 1 (trialPeriodDays), 2 (cancel target exists) | S |
| 4 — trial UI | 3 (a trialing subscription to render) | S |
| 5 — tests + docs | 2–4 | S–M |

Total: **M** (matches roadmap estimate). Nothing here blocks E04/E06–E08; E09 consumes Phase 1's public API untouched.
