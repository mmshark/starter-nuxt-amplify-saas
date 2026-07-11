# Billing layer

Workspace-scoped Stripe billing for the SaaS layer. New subscriptions start in Stripe Checkout;
existing paid subscriptions, payment methods and cancellations are managed in Stripe Customer
Portal. Stripe is the source of truth for the plan catalog.

## Architecture

- `PricingPlan`, `PricingPlans` and `PricingTable` render plans returned by the public
  `GET /api/billing/plans` endpoint.
- `CurrentSubscription`, `PaymentMethod` and `InvoicesList` render workspace billing state.
- `useBilling(workspaceId?)` stores isolated state per workspace and exposes Checkout, Portal and
  refresh operations. Call `ensureInitialized()` explicitly from the owning page.
- Authenticated Nitro routes live under `server/api/billing/`. They resolve prices and Stripe
  customer/subscription identifiers server-side and enforce the `manage-billing` permission.
- The Stripe webhook is **not** a Nitro route. It is the signature-verified `stripe-webhook` Lambda
  Function URL owned by `apps/backend`.

The ready-to-use pages are:

- `/settings/billing` — current subscription, payment method and invoices.
- `/settings/billing/plans` — real plan catalog, interval selection and owner-only upgrade/change
  actions.

## Plan catalog and trials

Plans are configured as Stripe Products and Prices. Product metadata provides `app_plan_id`,
`monthly_price`, `yearly_price`, `currency`, pipe-separated `features`, and optionally
`trial_period_days`. The backend plan seeder copies those values into `SubscriptionPlan`; there is
no local billing-plan configuration file.

For a free workspace, choosing a paid plan creates a Checkout session. If the selected plan has
`trial_period_days`, Checkout creates the subscription with that trial and still collects a payment
method. The billing page displays the remaining trial days after the webhook synchronizes the
subscription.

For a workspace whose subscription is `active`, `trialing`, or `past_due`, plan changes go through
Customer Portal. The Checkout endpoint also rejects this case with `409`, preventing duplicate
subscriptions.

## Composable

```vue
<script setup lang="ts">
const workspaceId = computed(() => useWorkspaces().currentWorkspace.value?.id)
const billing = useBilling(workspaceId)

onMounted(() => billing.ensureInitialized())

async function managePlan() {
  if (billing.hasActivePaidSubscription.value) {
    await billing.updateSubscription()
  } else {
    await navigateTo('/settings/billing/plans')
  }
}
</script>
```

The main returned state is `subscription`, `invoices`, `currentPlanId`, `isFreePlan`,
`hasActivePaidSubscription`, loading/error refs, and `initialized`. Operations include
`fetchSubscription`, `fetchInvoices`, `refreshSubscription`, `createCheckoutSession`, `openPortal`,
`updateSubscription`, `cancelSubscription`, `updatePaymentMethod` and `ensureInitialized`.

## Local verification

Use repository Taskfile operations whenever available:

```bash
task sandbox:start
task sandbox:generate
task billing:stripe:seed
task sandbox:seed
task billing:stripe:listen
task dev:saas
```

After deploying or redeploying the backend:

1. Set the Amplify `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` secrets.
2. Read `custom.stripeWebhookUrl` from the generated `amplify_outputs.json`.
3. Register that Function URL in Stripe, or export it as `STRIPE_WEBHOOK_URL` before starting the
   local Stripe listener.

The full E05 sandbox runbook and verified result live in
`.context/epic/20260708-pricing-upgrade-flow/spec.md`.
