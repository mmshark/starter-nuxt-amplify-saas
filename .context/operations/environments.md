# Environments — Local Sandbox Setup

> **Status**: Active · **Created**: 2026-07-08 · **Source**: README.md, AGENTS.md, taskfile.yaml, apps/backend/package.json

How to stand up and tear down a local development environment. Production/branch deployment is covered in [deployment.md](deployment.md).

## Environment model

There are two kinds of environments:

| Environment | Backend | How it's created |
|---|---|---|
| **Sandbox** (per developer) | Ephemeral Amplify Gen2 stack in your own AWS account (`ampx sandbox`) | `pnpm backend:sandbox:init` |
| **Deployed branch** (prod/staging) | Amplify Hosting apps built from Git | See [deployment.md](deployment.md) |

The Nuxt apps connect to whichever backend generated the `amplify_outputs.json` they were built against.

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20.19 | Nuxt 4 requirement. Amplify Console builds must override to Node 22 (see [deployment.md](deployment.md)) |
| pnpm | 10.13.1 | Pinned via `packageManager` in `package.json`; run `corepack enable` |
| AWS CLI | any recent | Credentials with Amplify/Cognito/DynamoDB/AppSync/Lambda permissions; verify with `aws sts get-caller-identity` |
| Stripe CLI | any recent | Only needed for billing work (`pnpm billing:stripe:login`) |

Optional per-project AWS config: use `AWS_PROFILE`/`AWS_REGION` (env vars or a root `.env.local`).

## Sandbox lifecycle

All commands run from the repo root (they are thin wrappers over `apps/backend/package.json` scripts).

| Step | Command | What it does |
|---|---|---|
| 1. Install | `corepack enable && pnpm install` | Workspace install |
| 2. Init | `pnpm backend:sandbox:init` | `ampx sandbox` — deploys Cognito, DynamoDB, AppSync, and the 3 Lambdas to your AWS account; writes `apps/backend/amplify_outputs.json`. Long-running watch process |
| 3. Secrets | `export STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...` then `pnpm backend:sandbox:secrets` | Sets both values as **Amplify sandbox secrets** (`ampx sandbox secret set`). Use a placeholder for `STRIPE_WEBHOOK_SECRET` on first run; update it after webhook wiring (below) |
| 4. Outputs | `pnpm amplify:sandbox:generate-outputs` | Regenerates `amplify_outputs.json` for the frontends |
| 5. Codegen | `pnpm amplify:sandbox:generate-graphql-client-code` | Generates GraphQL client types/operations |
| 6. Seed Stripe | `pnpm billing:sandbox:stripe:seed` | Applies the fixture `apps/backend/amplify/seed/data/stripe.json` (Products/Prices) to your Stripe test account |
| 7. Seed data | `pnpm backend:sandbox:seed` (or `:seed:plans` / `:seed:users`) | `ampx sandbox seed` — `seed:plans` syncs `SubscriptionPlan` rows **from** Stripe (Stripe is the source of truth; there is no local plans JSON); `seed:users` creates test users |
| 8. Dev server | `pnpm saas:dev` / `pnpm landing:dev` | SaaS on `http://localhost:3000` (auto-falls back to 3001), landing on 3001 |
| 9. Teardown | `pnpm backend:sandbox:delete` | Deletes the sandbox stack |

Steps 4–5 are required before the first frontend build and after any backend schema change ("Amplify not configured" / GraphQL type errors mean you skipped them).

### Stripe webhook wiring (sandbox)

The webhook endpoint is **not** a Nuxt/Nitro route — it is the `stripe-webhook` Lambda's public Function URL, exposed as `custom.stripeWebhookUrl` in `apps/backend/amplify_outputs.json`.

```bash
STRIPE_WEBHOOK_URL=<custom.stripeWebhookUrl> pnpm billing:stripe:listen
```

The Stripe CLI prints its signing secret (`whsec_...`) on startup — set that as `STRIPE_WEBHOOK_SECRET` (re-run step 3) so locally-forwarded events verify. For persistent testing, register the URL in the Stripe dashboard instead (see [deployment.md](deployment.md) for the event list).

## Secrets — what lives where

| Secret | Where it lives | Consumed by |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Both**: Amplify sandbox secret (`pnpm backend:sandbox:secrets`) **and** `apps/saas/.env` | Backend: seed scripts, `stripe-webhook` and `workspace-membership` Lambdas. SaaS: checkout/portal/invoices Nitro routes |
| `STRIPE_WEBHOOK_SECRET` | Amplify sandbox secret **only** | `stripe-webhook` Lambda (signature verification). Never read by either Nuxt app |
| `STRIPE_PUBLISHABLE_KEY` | `apps/saas/.env` | SaaS client-side Stripe |
| `APP_BASE_URL` | `apps/saas/.env` | Builds Stripe redirect URLs server-side (deliberately not derived from request headers) |

Create `apps/saas/.env` by copying `layers/billing/.env.example`. Never commit `.env` files.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `AWS_PROFILE` / `AWS_REGION` | all `ampx` commands | AWS account/region selection |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | `pnpm backend:sandbox:secrets` | Read from the shell env and pushed as sandbox secrets |
| `STRIPE_WEBHOOK_URL` | `pnpm billing:stripe:listen` | Target Function URL for event forwarding (required; the script fails without it) |
| `SANDBOX_STACK_NAME` | `taskfile.yaml` preconditions only | Not read by any pnpm script |
| `AWS_BRANCH` / `AWS_APP_ID` | `pnpm amplify:generate-outputs`, `deploy` | Deployed-branch variants of the generate/deploy commands |
| `GMAIL_APP_PASSWORD` | `apps/saas` Playwright e2e | IMAP email-verification helper; e2e also needs a live sandbox |

## Taskfile wrappers

`taskfile.yaml` (repo root) provides optional [Task](https://taskfile.dev) wrappers: `amplify.sandbox.init|delete|secrets|generate|seed`, `amplify.saas.dev`, and `clean.*` tasks (remove `.nuxt`, `.output`, `amplify_outputs*`, generated GraphQL, `node_modules`, …). All `amplify.*` tasks precondition on `AWS_PROFILE` and `SANDBOX_STACK_NAME` being set. They add nothing beyond the pnpm scripts plus the env checks.

## `amplify_outputs.json`

- Gitignored; generated by sandbox init / `generate-outputs`.
- `layers/amplify/plugins/01.amplify.client.ts`, `01.amplify.server.ts`, and `layers/amplify/server/utils/amplify.ts` import it **statically**. On a clean checkout without a deployed backend, `typecheck` and `build` fail (verified: 341 TS errors, including `TS2307 Cannot find module '../amplify_outputs.json'`). There is no stub/mock mechanism — you must run the sandbox first.

## Current status / known issues (audit-verified)

- **Broken seed script**: `pnpm backend:sandbox:amplify:seed` runs `tsx scripts/amplify-seed.ts`, but `apps/backend/scripts/` does not exist — the command always fails. Use `pnpm backend:sandbox:seed` instead.
- **User seed never creates subscriptions**: `apps/backend/amplify/seed/seeders/users.ts` only calls `createWorkspaceSubscription` when a fixture user has `planId` **and** `billingInterval`, and no user in the checked-in fixture sets them — seeded users all land on the free plan.
- **E2E needs live infra**: the Playwright suite requires a running sandbox, real Cognito sign-up, a Stripe test account, and Gmail IMAP credentials; it is not runnable in default CI.
- **Clean-checkout builds fail** without `amplify_outputs.json` (see above) — this is also why CI is currently red by design (see [deployment.md](deployment.md) and the roadmap's Phase 0 `E01 — green-ci` epic in [../prd/roadmap.md](../prd/roadmap.md)).
