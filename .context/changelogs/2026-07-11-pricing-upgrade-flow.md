# E05 — Pricing and upgrade flow

Completed the self-service revenue path from a free workspace to a paid Stripe subscription.

## Delivered

- Mounted the Stripe-backed plan catalog at `/settings/billing/plans`, including feature lists,
  monthly/yearly prices, current-plan state and owner-only actions.
- Added free-to-paid Checkout, metadata-driven trials, correct success/cancel destinations and a
  server guard against duplicate paid subscriptions.
- Added post-Checkout polling and trial visibility to the billing page.
- Made `useBilling` state workspace-safe and aligned all Amplify runtime packages to avoid split
  server-context instances.
- Made sandbox users reproducible: the seeder invokes the post-confirmation provisioning path,
  creates paid fixtures using Stripe test tokens, waits for webhook synchronization and fails on
  partial errors.
- Added unit coverage and a live-sandbox Playwright upgrade-flow test.

## Verification

On 2026-07-11, a seeded free owner completed a real Stripe test-mode Checkout for Pro. The signed
webhook returned successfully and the SaaS showed `TRIALING`, 14 days remaining, the Visa `4242`
payment method and the zero-value trial invoice without a new login. Unit tests, type checking,
linting and production builds are recorded by the closing PR checks.

## Operator note

Stripe fixture creation targets a clean or intentionally managed test account. Product/Price lookup
keys are globally unique in an account, so repeatedly applying the fixture after manual catalog
changes may require archiving the old test fixtures first.
