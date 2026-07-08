# Deployment — AWS Amplify Hosting

> **Status**: Active · **Created**: 2026-07-08 · **Source**: README.md, AGENTS.md, apps/backend/amplify.yml, apps/saas/amplify.yml, apps/landing/amplify.yml

How the three apps deploy from this monorepo, the **mandatory manual follow-ups** after every backend deploy, and the known gotchas. Local sandbox setup is in [environments.md](environments.md).

## Topology

Three separate Amplify Hosting apps, all connected to the **same Git repository**, each with its own `amplify.yml`:

| App | appRoot | Type | Build entry |
|---|---|---|---|
| Backend | `apps/backend` | Amplify Gen2 backend (Cognito, DynamoDB, AppSync, 3 Lambdas) | `apps/backend/amplify.yml` → `pnpm run deploy` (`ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID`) |
| SaaS | `apps/saas` | Nuxt 4 SSR | `apps/saas/amplify.yml` → `pnpm run build` |
| Landing | `apps/landing` | Nuxt 4 (intended SSG — see gotchas) | `apps/landing/amplify.yml` → `pnpm run build` |

Deploy order matters: **backend first**, then frontends (their preBuild runs `pnpm -w run amplify:generate-outputs` + `amplify:generate-graphql-client-code`, which need a deployed backend and `AWS_BRANCH`/`AWS_APP_ID`).

### Per-app build behavior (`apps/*/amplify.yml`)

- **Backend**: preBuild diffs the last commit and **skips the build** if nothing under `apps/backend/` or `layers/amplify/` changed. The frontend phase only emits a stub `dist/index.html` (Amplify requires a frontend artifact).
- **SaaS / Landing**: preBuild = `corepack enable` + `pnpm install --frozen-lockfile` + generate outputs/codegen; build = `pnpm run build`; artifacts served from `.amplify-hosting`. Note: `.amplify-hosting` is only produced by Nitro's `aws-amplify` preset, which **no `nuxt.config.ts` sets explicitly** — it relies on Nitro auto-detecting the Amplify build environment (audit flag; unverified end-to-end).

## Amplify Console setup checklist

For each app ("Create new app" → "Deploy from Git", same repo/branch):

1. Check **"My app is a monorepo"** and set the root directory (`apps/backend`, `apps/saas`, or `apps/landing`).
2. Check **"My monorepo uses Amplify Gen2 Backend"**.
3. Service role: **create a new one for the backend app**, then **reuse that same role** for SaaS and landing (needed for `generate-outputs` / CloudFormation access, e.g. `cloudformation:GetTemplateSummary`).
4. **Node 22 package version override** on SaaS and landing (App Settings → Build settings → Advanced → Package version overrides: `Node` = `22`). Required: Nuxt 4's `oxc-parser` native bindings fail on older default images (`Cannot find module '@oxc-parser/binding-linux-x64-gnu'`).

## Secrets and environment variables per app

| App | Secrets (App Settings → Secrets) | Environment variables |
|---|---|---|
| Backend | `STRIPE_SECRET_KEY` (seed scripts + `stripe-webhook`/`workspace-membership` Lambdas), `STRIPE_WEBHOOK_SECRET` (verified inside the `stripe-webhook` Lambda; placeholder on first deploy, real value after follow-up #1–2 below) | — |
| SaaS | `STRIPE_SECRET_KEY` (checkout/portal/invoices Nitro routes) | `STRIPE_PUBLISHABLE_KEY`, `NUXT_PUBLIC_SITE_URL`, `BACKEND_APP_ID` |
| Landing | — | `NUXT_PUBLIC_SITE_URL`, `BACKEND_APP_ID` |

`STRIPE_WEBHOOK_SECRET` is a **backend-only** secret. The SaaS app never sees it and does not handle webhook delivery — there is no Nitro `/api/billing/webhook` route.

## MANDATORY operator follow-ups after deploying/redeploying the backend

These are **not automated** (source: AGENTS.md "Operator follow-ups"; details in `layers/billing/README.md` / `apps/backend/README.md`):

1. **Set `STRIPE_WEBHOOK_SECRET`** — `pnpm backend:sandbox:secrets` for the sandbox; Amplify Console → App Settings → Secrets for deployed branches.
2. **Register the webhook URL** — read `custom.stripeWebhookUrl` from the freshly generated `amplify_outputs.json` and register it as the Stripe webhook endpoint (Stripe dashboard for deployed branches; `stripe listen --forward-to` for local dev). Remove/disable any old endpoint pointing at a Nitro route. Events: `customer.subscription.created|updated|deleted`, `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`. Then copy that endpoint's signing secret back into `STRIPE_WEBHOOK_SECRET` (step 1) and redeploy/restart the backend so the `stripe-webhook` Lambda picks it up.
3. **Cognito group backfill** — tenant rows created before the group-per-workspace model existed (e.g. a long-lived sandbox) have no `readerGroups`/`writerGroups` and no corresponding Cognito groups; those workspaces are **invisible to their members** until backfilled: create the `ws:<id>:members` / `ws:<id>:admins` groups, add the members, and stamp the group fields on the existing rows. Fresh environments need no backfill.
4. **Token refresh after group changes** — Cognito group membership is stamped into JWTs at token-issue time. `useWorkspaces.createWorkspace()` force-refreshes the session after creating a workspace, but **accepting an invitation or a role change does not auto-refresh** the affected user's session — they must sign out/in, or the app must call `fetchAuthSession({ forceRefresh: true })`, before the new access is visible. Conversely, a **removed member's existing tokens keep working until expiry** (default ~1h) even though the `WorkspaceMember` row is gone: Nitro routes deny immediately (fail-closed), but a direct AppSync read is not revoked until the token expires.

## Known deployment gotchas (audit-verified)

- **Landing `generate` fails on a clean checkout.** `pnpm --filter @starter-nuxt-amplify-saas/landing generate` was executed by the auditor and fails — first because `layers/amplify/tsconfig.json` references `./.nuxt/tsconfig.app.json` files that don't exist before `nuxt prepare`, and because `amplify_outputs.json` (gitignored, statically imported by `layers/amplify` plugins) is absent. The CI step that runs it (`.github/workflows/ci.yml`) cannot pass as written and CI has **zero recorded runs** on GitHub; fixing this is roadmap Phase 0 `E01 — green-ci` ([../prd/roadmap.md](../prd/roadmap.md)).
- **Landing amplify.yml build-vs-generate incoherence.** `apps/landing/amplify.yml` runs `pnpm run build` (SSR output in `.amplify-hosting`, hosted with compute) while README and CI treat the app as SSG via `generate`. Deployed as-is you pay for SSR compute unnecessarily — and what gets served is Nuxt's default `NuxtWelcome` screen, because `apps/landing` has **no pages of its own** (`apps/landing/app/app.vue` renders `<NuxtWelcome />`; there is no `app/pages/` directory).
- **Landing is coupled to the backend even for a static build**: it extends `@mmshark/amplify-layer` (`apps/landing/nuxt.config.ts`), so generating it requires backend outputs.
- **Clean-checkout typecheck/build failure**: 341 TS errors without `amplify_outputs.json` (see [environments.md](environments.md)) — the frontend Amplify builds only work because their preBuild generates outputs against the already-deployed backend.

## Current status

- The Amplify Console flow above is documented from README.md and the `amplify.yml` files; it has **not been re-verified end-to-end** as part of the 2026-07 audit (no accessible production deployment of this repo).
- GitHub Actions CI (`.github/workflows/ci.yml`) exists on this branch but has never run successfully (and is absent from `origin/master` per the audit); the two publish workflows (`publish-layers.yml`, `publish-on-tag.yml`) publish layers to GitHub Packages and are independent of app deployment.
- There are no preview environments, no post-deploy smoke tests, and no automated execution of the operator follow-ups above.
