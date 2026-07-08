# PRD: Billing (Stripe subscriptions)

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/billing.md

## Purpose & scope

Workspace-level subscription management on Stripe. Subscriptions belong to **workspaces**, not users: the Stripe customer id lives on `WorkspaceSubscription`, all members share the workspace's plan, and only holders of the `manage-billing` permission (workspace OWNER) can change billing.

**Architectural decisions** (all implemented, see Current status):

| Decision | Consequence |
|---|---|
| **Workspace-scoped** | One Stripe customer + one subscription per workspace; provisioned atomically at workspace creation (`layers/billing/server/utils/ensureWorkspaceBilling.ts`, privileged-Lambda only) |
| **Portal-first** | Plan changes, proration, payment methods and cancellation are delegated to the Stripe Customer Portal; the app only creates portal/checkout sessions and reads state |
| **Plan catalog syncs FROM Stripe** | Stripe Products/Prices are the source of truth. `stripe fixtures` seeds Stripe from `apps/backend/amplify/seed/data/stripe.json`; the plans seeder (`apps/backend/amplify/seed/seeders/plans.ts`) reads Stripe and upserts `SubscriptionPlan` rows in DynamoDB. There is **no** local `plans.json`/`billing-plans.json` |
| **Webhook = Lambda Function URL** | Stripe events hit the `stripe-webhook` Amplify function via a public Function URL (`custom.stripeWebhookUrl` in `amplify_outputs.json`), authorized by signature verification only. There is **no** Nitro `/api/billing/webhook` route |
| **Tenant tables read-only for clients** | `WorkspaceSubscription` / `ProcessedStripeEvent` are written only by Lambdas holding `allow.resource(...)` grants; Nuxt routes and browsers can only read |

**Out of scope** (delegated to Stripe): payment method collection, invoice generation, tax calculation. Feature/permission gating from the subscription is the entitlements layer's job.

## Requirements

### Functional

| # | Requirement |
|---|---|
| F1 | User can view the active plan catalog (public read, also usable by the landing site) |
| F2 | Workspace OWNER can subscribe a free workspace to a paid plan via Stripe Checkout (monthly/yearly) |
| F3 | Workspace OWNER can manage the subscription via Stripe Customer Portal: change plan (prorated), update payment method, cancel (at period end) |
| F4 | Workspace members can view the current subscription and payment method; invoice history (with pagination + PDF download) is restricted to workspace OWNER/ADMIN |
| F5 | Subscription state syncs automatically from Stripe webhooks into `WorkspaceSubscription`; processing is signature-verified, idempotent and order-guarded |
| F6 | On subscription deletion the workspace reverts to the `free` plan |
| F7 | Server code can gate actions on billing permission (`requirePermission(event, 'manage-billing', workspaceId)` from the entitlements layer) |

### Data model (`apps/backend/amplify/data/resource.ts`)

| Model | Key fields | Write access |
|---|---|---|
| `SubscriptionPlan` | `planId` (PK), `name`, `description`, `monthlyPrice`, `yearlyPrice`, `priceCurrency`, `stripeMonthlyPriceId`, `stripeYearlyPriceId`, `stripeProductId`, `isActive` | admins group; read: public API key + authenticated |
| `WorkspaceSubscription` | `workspaceId` (PK), `planId`, `stripeSubscriptionId`, `stripeCustomerId` (required), `status` enum (`active`, `past_due`, `canceled`, `trialing`, `incomplete`, `incomplete_expired`, `unpaid`), `currentPeriodStart/End`, `cancelAtPeriodEnd`, `billingInterval`, `trialStart`, `trialEnd`; secondary index on `stripeCustomerId` | `stripe-webhook`, `workspace-membership` and `post-confirmation` Lambdas only (post-confirmation creates the free-plan row at signup via `ensureWorkspaceBilling`; grant is schema-level `allow.resource(postConfirmation)`); read: workspace `readerGroups` |
| `ProcessedStripeEvent` | `eventId` (PK), `type`, `processedAt` — webhook dedupe table | `stripe-webhook` Lambda only |

Note: trials exist only as data (`trialStart`/`trialEnd` and the `trialing` status value); there is no `trialing` field.

### Server API (`layers/billing/server/api/billing/`)

| Endpoint | Auth | Behavior |
|---|---|---|
| `GET /api/billing/plans` | public | Lists active `SubscriptionPlan` rows; computes `yearlySavings` (`plans.get.ts`) |
| `POST /api/billing/checkout` | `manage-billing` on `workspaceId` | Body: `{workspaceId, planId, billingInterval}`. Price id is looked up **server-side** from the plan (client cannot inject `priceId`). Self-heals a missing Stripe customer via the `workspace-membership` Lambda (`ensureBilling`). Creates a subscription-mode Checkout session with `metadata.workspaceId`, promotion codes enabled (`checkout.post.ts`) |
| `POST /api/billing/portal` | `manage-billing` on `workspaceId` | 4 flows: `subscription_update`, `subscription_cancel`, `payment_method_update`, `subscription_update_confirm`. `return_url` is derived server-side from `appBaseUrl` (client-supplied URLs rejected — anti open-redirect) (`portal.post.ts`) |
| `GET /api/billing/subscription` | workspace member | Aggregates `WorkspaceSubscription` + `SubscriptionPlan` + Stripe payment method for `?workspaceId=` (`subscription.get.ts`) |
| `GET /api/billing/invoices` | workspace OWNER/ADMIN | Stripe invoice list for the workspace customer, cursor pagination (`limit`, `startingAfter`); plain MEMBERs get 403 (`invoices.get.ts`) |

### Webhook (`apps/backend/amplify/functions/stripe-webhook/`)

- Public Lambda Function URL (`authType: NONE`, wired in `apps/backend/amplify/backend.ts`); the Stripe **signature is the authorization** — `stripe.webhooks.constructEvent` against `STRIPE_WEBHOOK_SECRET` (Amplify secret) before anything is parsed or persisted.
- Handles `customer.subscription.created|updated|deleted`, `checkout.session.completed`, `invoice.payment_succeeded|payment_failed` (`handler.ts`).
- Resolves the workspace from `metadata.workspaceId`; dedupes via `ProcessedStripeEvent`; drops out-of-order events (compares Stripe `event.created` vs record `updatedAt`); whitelists subscription statuses; reverts the workspace to `planId: 'free'` on deletion.

### Client surface (`layers/billing/`)

- `useBilling(workspaceId?)` composable (`composables/useBilling.ts`): per-workspace state (`subscription`, `invoices`, loading/error refs), computed helpers (`hasActivePaidSubscription`, `currentPlanId`, `isFreePlan`), portal methods (`openPortal`, `updateSubscription`, `cancelSubscription`, `updatePaymentMethod`, `confirmSubscriptionUpdate`), `createCheckoutSession`, fetch/refresh/pagination methods, explicit `ensureInitialized()` (no auto-init). `useBillingServer(workspaceId)` for server contexts.
- Components: `CurrentSubscription`, `PaymentMethod`, `InvoicesList` (mounted on `/settings/billing` — `layers/saas/pages/settings/billing.vue`); `PricingPlan`, `PricingPlans`, `PricingTable` (Nuxt UI wrappers with auto-fetch from `/api/billing/plans` — **currently unmounted**, see below).

### Configuration

| Variable | Where | Purpose |
|---|---|---|
| `APP_BASE_URL` | Nuxt app env | Base for checkout/portal redirect URLs; must never come from request headers |
| `STRIPE_SECRET_KEY` | Nuxt app env + Amplify secret | Stripe API (app) / signature verification (Lambda) |
| `STRIPE_PUBLISHABLE_KEY` | Nuxt app env | Client-safe key |
| `STRIPE_WEBHOOK_SECRET` | Amplify secret only | Webhook endpoint signing secret (not read by the Nuxt app) |

See `layers/billing/.env.example`.

## Current status

Audit (2026-07): implementation 3/5, quality 4/5. Backend is solid; the revenue-critical upgrade UX is broken.

| Area | Status | Evidence |
|---|---|---|
| Checkout endpoint (server-side price lookup, permission guard, self-heal provisioning) | ✅ Implemented | `layers/billing/server/api/billing/checkout.post.ts` |
| Customer Portal, 4 flows, server-derived `return_url` | ✅ Implemented | `layers/billing/server/api/billing/portal.post.ts` |
| Plans/subscription/invoices read APIs | ✅ Implemented | `layers/billing/server/api/billing/` |
| Webhook Lambda: signature check, dedupe, order guard, status whitelist, revert-to-free, trial field sync | ✅ Implemented | `apps/backend/amplify/functions/stripe-webhook/handler.ts` |
| Workspace billing bootstrap (idempotent Stripe customer + `WorkspaceSubscription` on workspace create) | ✅ Implemented | `layers/billing/server/utils/ensureWorkspaceBilling.ts` |
| Plan catalog sync from Stripe (fixtures + seeder) | ✅ Implemented | `apps/backend/amplify/seed/seeders/plans.ts`, `apps/backend/amplify/seed/data/stripe.json` |
| Billing settings page (subscription, payment method, invoices) | ✅ Implemented | `layers/saas/pages/settings/billing.vue` |
| **Free→paid upgrade flow** | ❌ **Broken end-to-end** | Pricing components are not mounted on any page in `apps/saas` or `apps/landing`; no `/pricing` route exists (checkout `cancel_url` → `${baseUrl}/pricing` → 404); "Change Plan" on `CurrentSubscription` opens the portal, which cannot start a *first* subscription for a free workspace |
| Taxes | ❌ Missing | No `automatic_tax` in `checkout.sessions.create` (no Stripe Tax) |
| Trials | ⚠️ Data-level only | `trialStart`/`trialEnd` synced by webhook; no `trial_period_days` at checkout, no remaining-days UI |
| Dunning | ❌ Missing | `invoice.payment_failed` is only logged in the webhook; no emails/notifications/recovery UX |
| Tests | ⚠️ Partial | Unit: `layers/billing/composables/__tests__/formatPrice.test.ts` and the authorization guard in `layers/entitlements/server/utils/__tests__/requirePermission.test.ts`. E2E: Playwright billing spec (4 tests: plans API + billing settings page) at `apps/saas/tests/e2e/specs/layers/billing/plans.spec.js`, plus `apps/saas/tests/e2e/specs/flows/new-user-journey.spec.js` (active, `flows` Playwright project), which exercises the Customer Portal (payment-method add, plan change to `pro`) and webhook-driven subscription sync (`waitForSubscriptionSync`). Caveat: the journey's plan-change step relies on the portal starting a *first* subscription for a free workspace — which the broken upgrade flow above says does not work — so treat that spec as aspirational until E05. No E2E for the Checkout-session flow |

Dropped from the source PRD (never implemented, removed from spec): Nitro `POST /api/billing/webhook` route, `requireSubscription()`/`withSubscription()` server utilities (no such code exists — server-side gating is `requirePermission` from the entitlements layer), Zod request validation (validation is manual), and the `SubscriptionPlan.features`/`limits` fields (feature limits belong to the entitlements layer).

## Open issues & risks

1. **Webhook dedupe is not transactional**: the `ProcessedStripeEvent` record is created *after* processing; a crash between the `WorkspaceSubscription` upsert and the dedupe write can reprocess an event (partially mitigated by the order guard; acknowledged in `handler.ts` comments).
2. **Order guard mixes clock domains**: it compares Stripe `event.created` against DynamoDB `updatedAt`. A legitimate event created just before a local write can be misclassified as stale and dropped.
3. **Rollback vs Stripe idempotency**: in `layers/billing/server/utils/ensureWorkspaceBilling.ts` (rollback block, ~lines 61–99) a failed `WorkspaceSubscription` write deletes the just-created Stripe customer; the comment assumes a retry with `idempotencyKey: workspaceId` creates a fresh customer, but Stripe replays cached idempotent responses (~24h), so a prompt retry can receive the id of the deleted customer.
4. **Checkout `cancel_url` 404s** until a `/pricing` route exists (see Current status).
5. **Layer README drift**: `layers/billing/README.md` still documents a Nitro `webhook.post.ts` route, `billing-plans.json` plan config and user-profile-based subscriptions — none of which exist in this workspace-scoped, portal-first implementation.

## Related

- [Roadmap](../prd/roadmap.md) — gaps are covered by **E05 pricing-upgrade-flow** (mount pricing components, `/pricing` route, first-subscription checkout, `cancel_url` fix, trial support), **E09 landing-site** (public pricing from the `SubscriptionPlan` read), **E17 background-jobs** (`ProcessedStripeEvent` purge/TTL, Stripe reconciliation sync), **E04 transactional-email** (prerequisite for dunning emails).
- Sibling PRDs: [entitlements](./entitlements.md) (feature gating and `manage-billing` permission), [workspaces](./workspaces.md) (workspace lifecycle that provisions billing), [auth](./auth.md).
- Layer reference: `layers/billing/README.md` (note: partially stale, see Open issues #5).
