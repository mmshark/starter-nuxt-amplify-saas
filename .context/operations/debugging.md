# Debugging & Troubleshooting

> **Status**: Active · **Created**: 2026-07-08 · **Source**: AGENTS.md (Troubleshooting), layers/debug/README.md, audit digest 2026-07 (observability, dx)

How to diagnose problems in local development, what the dev-only debug pages actually show, where logs end up today, and what the e2e suite needs to run. Known-broken items link to the remediation epics in [../roadmaps/20260711-saas-boilerplate-productization.md](../roadmaps/20260711-saas-boilerplate-productization.md).

## Troubleshooting table

| Symptom | Cause | Fix |
|---|---|---|
| Runtime error that Amplify is not configured; `runtimeConfig.public.amplify` missing | `amplify_outputs.json` absent or stale (it is gitignored) | Start a sandbox (`pnpm backend:sandbox:init`), then `pnpm amplify:sandbox:generate-outputs` |
| Live app reports missing/invalid Amplify configuration | Offline CI may use the committed-compatible stub, but live auth/data requires real generated outputs | Run `task sandbox:start`, then `task sandbox:generate`; use `task sandbox:outputs:stub` only for offline checks |
| Plans not loading in UI / empty pricing data | Plans are synced **from** Stripe Products/Prices into the `SubscriptionPlan` table — there is no local plans config file. Not seeded, or `STRIPE_SECRET_KEY` sandbox secret missing, or the Stripe account has no active products | `pnpm backend:sandbox:secrets` (needs `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` in env), seed Stripe if empty (`pnpm billing:sandbox:stripe:seed`), then `pnpm backend:sandbox:seed:plans`. Verify at `/debug/plans` or `GET /api/billing/plans` |
| GraphQL types out of sync (TS errors on `client.models.*` after schema change) | Client codegen not re-run after editing `apps/backend/amplify/data/resource.ts` | `pnpm amplify:sandbox:generate-graphql-client-code` |
| Port 3000 already in use | Another process owns 3000; Nuxt auto-falls back to 3001 | Usually nothing. But the e2e suite defaults to `BASE_URL=http://localhost:3000` — export `BASE_URL` if the app moved port |
| Invitation flow dead-ends: invitation created but invitee never receives anything; no page to accept | Not implemented end-to-end: no email integration exists anywhere in the repo (no SES/Resend/nodemailer), and no page consumes the accept/decline endpoints (`layers/workspaces/server/api/workspaces/[id]/invitations/[invitationId]/accept.post.ts`, `decline.post.ts`) | No workaround in-product. Feature completion is roadmap epics E04 (transactional-email) and E08 (workspace-lifecycle) |
| Node native binding errors in Amplify Console builds | Build image Node version mismatch | Set the Node 22 override in Amplify Console (see `README.md`) |

## Debug layer pages (`layers/debug/`)

Three dev-only pages. Each one starts with the same guard — outside `import.meta.dev` it throws a 404 (`createError({ statusCode: 404 })`), so the pages are unreachable in production builds. All use `layout: false`. The layer extends `@mmshark/auth-layer` and `@mmshark/billing-layer` (`layers/debug/nuxt.config.ts`) for `useUser`/`useBilling`; the Amplify plugin must come from the consuming app.

| Page | File | What it actually shows |
|---|---|---|
| `/debug` | `layers/debug/pages/debug/index.vue` | System info (dev/prod, client/server, presence of Stripe publishable key and Amplify runtime config), available composables (`useUser`/`useBilling`/`useStripe`), profile + session state (auth step, `authSession` JSON), and billing test buttons: Test Checkout, Test Portal, Get Subscription, Test Cancel against the real `/api/billing/*` routes. The Stripe secret key is deliberately reported only as Configured/Not set — the page is SSR-rendered and must never leak the value. The plan selector loads plans from `GET /api/billing/plans` (the real `SubscriptionPlan` table synced from Stripe); Test Checkout is enabled once a plan with a Stripe price id is selected |
| `/debug/plans` | `layers/debug/pages/debug/plans.vue` | Lists `SubscriptionPlan` rows client-side via `generateClient<Schema>()` (active-only filter): pricing, Stripe product/price IDs, per-plan completeness badge, raw JSON, and a link to `GET /api/billing/plans` (`layers/billing/server/api/billing/plans.get.ts`). This is the reliable way to check that plan seeding worked. **Caveat**: its empty state suggests `pnpm tsx scripts/billing-seed-plans.ts` — that script does not exist; use `pnpm backend:sandbox:seed:plans` |
| `/debug/profile` | `layers/debug/pages/debug/profile.vue` | Form to edit Cognito attributes (`custom:display_name`, `given_name`, `family_name`) via `updateAttributes` from `useUser`; shows a not-authenticated warning otherwise |

Note: `layers/debug/README.md` overstates the layer (claims "create test subscriptions", "error testing", and lists only two pages). Trust the page sources above over that README.

## Where logs go today

Honest picture — there is **no observability stack**; this is plain `console.*`:

- **Lambdas** (`apps/backend/amplify/functions/stripe-webhook/handler.ts`, `apps/backend/amplify/functions/workspace-membership/handler.ts`, `apps/backend/amplify/auth/post-confirmation/handler.ts`): `console.log/error` with reasonable context (eventId, workspaceId, event type). These reach **CloudWatch Logs** via default Lambda behavior — that is the only place backend errors are visible. The stripe-webhook handler fails loudly (responds 500) and is idempotent via `ProcessedStripeEvent`.
- **Nitro server routes and Vue app**: `console.*` goes to the dev terminal locally; on Amplify Hosting, SSR compute logs are delivered to the app's CloudWatch log group by the platform.
- **`createLogger(scope)`** (`layers/amplify/utils/logger.ts`): a scope-prefixed, env-aware console wrapper (debug/info dev-only; warn/error always). It exists but has **zero usages** in the repo — claims in `layers/amplify/README.md` and `AGENTS.md` that it is "used across server code" are documentation drift. Roughly 30 files log ad hoc with bare `console.*` instead.

### Current status — not implemented

Per the 2026-07 observability audit, none of the following exists (Phase 2 of the roadmap):

- Error tracking (no Sentry/Datadog/Bugsnag anywhere; no Nuxt observability module).
- Global error handling: no `error.vue`, no `NuxtErrorBoundary`, no `vue:error`/`app:error` hooks — unhandled errors fall through to Nuxt's default error page uncaptured.
- Health check endpoint (`/api/health` or similar).
- Request tracing: no requestId/correlation-id between Nitro and Lambdas, no X-Ray/OpenTelemetry.
- Structured logging (no JSON output, no pino/winston).

## E2E suite prerequisites

Suite lives at `apps/saas/tests/e2e/` (Playwright, `apps/saas/tests/e2e/playwright.config.js`). It runs against **live infrastructure** — nothing is mocked, and the config has no `webServer` block, so you must start everything yourself:

1. **Live Amplify sandbox** (real Cognito + DynamoDB): `pnpm backend:sandbox:init`, outputs + client codegen generated, plans and users seeded (`pnpm backend:sandbox:seed:plans`, `pnpm backend:sandbox:seed:users`). Test users in `apps/saas/tests/e2e/fixtures/users.json` (e.g. `test+free1@ontopix.ai`) must exist in the user pool.
2. **App running** at `BASE_URL` (default `http://localhost:3000`): `pnpm saas:dev`.
3. **Gmail IMAP access** for signup/verification-code specs: `apps/saas/tests/e2e/helpers/auth.js` connects to `imap.gmail.com` with `GMAIL_USER` (default `test@ontopix.ai`) and `GMAIL_APP_PASSWORD`; all test addresses plus-alias into that one inbox.
4. **Stripe test account** with the seeded products/prices (`pnpm billing:sandbox:stripe:seed`) and the sandbox secrets set (`pnpm backend:sandbox:secrets`); billing specs drive the real Stripe Checkout/Billing Portal DOM (`apps/saas/tests/e2e/helpers/stripe.js`).
5. **Chromium**: `pnpm saas:test:e2e:setup` (runs `playwright install chromium`).

Run with `pnpm saas:test:e2e` (or `:auth` / `:billing` subsets). Env vars: `BASE_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, optional `TEST_USER`/`TEST_PASS` overrides.

Known suite defects (2026-07 testing audit): the `individual` project's `testMatch: '**/layers/*.spec.js'` matches nothing (specs are nested one level deeper, e.g. `specs/layers/auth/`), and a full run executes `specs/flows/new-user-journey.spec.js` twice (once under the catch-all `chromium` project, once under `flows`). The suite's dependence on live Gmail/Stripe/Cognito makes it inherently fragile and non-portable; there are no e2e specs for workspaces, entitlements, or password reset.
