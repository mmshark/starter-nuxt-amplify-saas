# Backend (AWS Amplify Gen2)

The AWS Amplify Gen2 backend for the starter kit: Cognito authentication, an AppSync GraphQL API backed by DynamoDB (`amplify/data/resource.ts`), and three privileged Lambda functions that own every tenant-table write. Package name: `@starter-nuxt-amplify-saas/backend`.

## Table of Contents

- [Overview](#overview)
- [Authorization Model](#authorization-model)
- [Data Models](#data-models)
- [Privileged Functions](#privileged-functions)
- [Seed System](#seed-system)
- [Scripts](#scripts)
- [Secrets](#secrets)
- [Registering the Stripe Webhook](#registering-the-stripe-webhook)

## Overview

```
apps/backend/
├── amplify/
│   ├── auth/
│   │   ├── resource.ts              # Cognito user pool config (email login, profilePicture attr)
│   │   └── post-confirmation/       # Post-confirmation trigger (personal workspace bootstrap)
│   ├── data/
│   │   └── resource.ts              # GraphQL schema, models, authorization rules
│   ├── functions/
│   │   ├── workspace-membership/    # Privileged Lambda: all workspace/member/invite writes
│   │   └── stripe-webhook/          # Public Function URL: Stripe → WorkspaceSubscription sync
│   ├── seed/                        # Sandbox seeders (Stripe plans + demo users)
│   └── backend.ts                   # Wires functions, IAM grants, custom outputs
└── package.json                     # Scripts: deploy, sandbox, seed, secrets
```

Authorization mode is `userPool` by default (`defaultAuthorizationMode: "userPool"` in `amplify/data/resource.ts`), with a read-only API-key mode for the public pricing page (`SubscriptionPlan`, 365-day key).

## Authorization Model

This backend uses **group-per-workspace** multi-tenancy, not per-record ownership alone. Every workspace is guarded by two Cognito user pool groups:

- `ws:<workspaceId>:members` — the **reader** group. Every member (OWNER, ADMIN, MEMBER) belongs to it. Tenant records carry this group name in a `readerGroups` field and are authorized with `allow.groupsDefinedIn('readerGroups').to(['read'])`.
- `ws:<workspaceId>:admins` — the **admin marker** group. Only OWNER/ADMIN members belong to it. It is retained as metadata (`writerGroups` field) for the Lambdas' own role logic, but **it grants no AppSync access** — it is not a write grant.

**Clients are read-only on every tenant table.** No model grants `create`/`update`/`delete` to any client principal (not `groupsDefinedIn`, not `ownerDefinedIn`, not `authenticated()`). Every write to `Workspace`, `WorkspaceMember`, `WorkspaceSubscription`, or `WorkspaceInvitation` goes through one of the three privileged Lambdas below, each granted with `allow.resource(...)` in the schema and each independently re-verifying the caller's identity and role — a client can never set its own `readerGroups`/`writerGroups`, `role`, or `planId`.

Because group membership is stamped into a user's Cognito access/ID token at issue time, any action that changes group membership (creating a workspace, accepting an invitation) only becomes visible after the user's next token refresh. Clients must call `fetchAuthSession({ forceRefresh: true })` after such actions — see `layers/workspaces/composables/useWorkspaces.ts`'s `createWorkspace()` for the pattern.

## Data Models

All models live in `amplify/data/resource.ts`:

- **`UserProfile`** — `userId` (id), `stripeCustomerId`. Owner-readable only (`allow.ownerDefinedIn("userId").to(["read"])`); the only writer is the `post-confirmation` trigger.
- **`SubscriptionPlan`** — `planId` (id), `name`, `description`, `monthlyPrice`, `yearlyPrice`, `priceCurrency`, `stripeMonthlyPriceId`, `stripeYearlyPriceId`, `stripeProductId`, `isActive`. Readable by public API key (landing page) and any authenticated user; only the `admin` Cognito group can create/update/delete.
- **`Workspace`** — `name`, `slug`, `description`, `ownerId`, `isPersonal`, `memberCount`, `readerGroups`, `writerGroups`, plus `members`/`invitations`/`subscription` relations. Secondary indexes on `slug` and `ownerId`. Read via `ownerDefinedIn('ownerId')` or `groupsDefinedIn('readerGroups')`; writes only via `workspace-membership`.
- **`WorkspaceSubscription`** — keyed by `workspaceId`, `planId`, `stripeSubscriptionId`, `stripeCustomerId`, `status` (enum: active/past_due/canceled/trialing/incomplete/incomplete_expired/unpaid), `currentPeriodStart`/`currentPeriodEnd`, `cancelAtPeriodEnd`, `billingInterval` (month/year), `trialStart`/`trialEnd`, `readerGroups`, `writerGroups`. Secondary index on `stripeCustomerId`. Read via `groupsDefinedIn('readerGroups')`; writes only via `stripe-webhook` (Stripe sync) or `workspace-membership` (billing bootstrap).
- **`WorkspaceMember`** — `workspaceId`, `userId`, `email`, `name`, `role` (enum: OWNER/ADMIN/MEMBER), `joinedAt`, `readerGroups`, `writerGroups`. Secondary indexes on `workspaceId` and `userId`. Read via `ownerDefinedIn('userId')` or `groupsDefinedIn('readerGroups')`; writes only via `workspace-membership`.
- **`WorkspaceInvitation`** — `workspaceId`, `email`, `role`, `invitedBy`, `inviterName`, `inviterEmail`, `token`, `expiresAt`, `message`, `status` (enum: PENDING/ACCEPTED/DECLINED/EXPIRED), `readerGroups`, `writerGroups`. Secondary indexes on `workspaceId` and `email`. Read via `groupsDefinedIn('readerGroups')`; writes only via `workspace-membership`.
- **`ProcessedStripeEvent`** — `eventId` (id), `type`, `processedAt`. Write-only by `stripe-webhook`; used purely to dedupe redelivered Stripe events.

## Privileged Functions

### `amplify/functions/workspace-membership/`

Handles every tenant write for workspace lifecycle: `createWorkspace`, `updateWorkspace`, `deleteWorkspace`, `createInvitation`, `acceptInvitation`, `declineInvitation`, `updateMemberRole`, `removeMember`, `ensureBilling`.

- Invoked from Nitro server routes via `invokeWorkspaceMembership()` in `layers/amplify/server/utils/workspaceMembership.ts`, using the **caller's own authenticated Cognito Identity Pool credentials** (`backend.workspaceMembership.resources.lambda.grantInvoke(backend.auth.resources.authenticatedUserIamRole)` in `backend.ts` — the unauthenticated/guest role is never granted invoke).
- The Lambda does not trust the payload's claimed identity: it forwards the caller's Cognito access token and calls `GetUser` itself to resolve `userId`/`email`/`username`, then re-checks OWNER/ADMIN business rules per action (e.g. only OWNER can `updateMemberRole`/`deleteWorkspace`/`ensureBilling`; OWNER or ADMIN can `updateWorkspace`/`createInvitation`/`removeMember`).
- It owns Cognito group lifecycle (`CreateGroupCommand`/`DeleteGroupCommand`/`AdminAddUserToGroupCommand`/`AdminRemoveUserFromGroupCommand`) alongside the DynamoDB writes, e.g. `createWorkspace` creates the `ws:<id>:members`/`ws:<id>:admins` groups, adds the caller to both, creates the `Workspace` + owner `WorkspaceMember` rows, and provisions Stripe billing — rolling back groups/rows on any failure.
- `acceptInvitation` requires a constant-time match of the invitation's stored `token` (not just an email match, since member emails are visible to other members) and re-verifies the inviter still holds OWNER/ADMIN before honoring the invite.

### `amplify/functions/stripe-webhook/`

The direct Stripe webhook endpoint, exposed as a Lambda **Function URL** with `authType: FunctionUrlAuthType.NONE` — no IAM principal can invoke it, only Stripe hitting the public URL. It verifies the `stripe-signature` header against the raw body using the `STRIPE_WEBHOOK_SECRET` secret (`stripe.webhooks.constructEvent`) before parsing or persisting anything; an invalid signature returns 400 without touching the database.

It handles `customer.subscription.created/updated/deleted`, `checkout.session.completed` (no-op; the paired subscription event does the write), and `invoice.payment_succeeded/failed` (logged only). Every processed event is recorded in `ProcessedStripeEvent` keyed by Stripe's `eventId` for idempotency on redelivery, and an ordering guard ignores events older than the last write for that workspace (Stripe doesn't guarantee delivery order).

### `amplify/auth/post-confirmation/`

The Cognito post-confirmation trigger. Runs **before the user's first sign-in**, so their very first tokens already carry the new groups. It creates: the `UserProfile` row, the `ws:<id>:members`/`ws:<id>:admins` groups for a freshly generated personal-workspace id, adds the user to both groups, creates the personal `Workspace` (`isPersonal: true`) and owner `WorkspaceMember`, and provisions the workspace's Stripe customer + free `WorkspaceSubscription` via the shared `ensureWorkspaceBilling` helper. Errors are logged and swallowed (never thrown) so a billing hiccup can't block user registration.

## Seed System

Seeding lives in `amplify/seed/` and has two independent tasks, both idempotent:

- **Plans** (`amplify/seed/seeders/plans.ts`, `syncPlansFromStripe()`) — there is **no static plans config**. It reads whatever products/prices currently exist in Stripe (`fetchStripeProductsWithPrices`) and upserts a matching `SubscriptionPlan` row per product, deriving `planId` from the product's `app_plan_id` metadata and pricing from its monthly/yearly `Price` objects.
- **Users** (`amplify/seed/seeders/users.ts`, `seedUsers()`) — reads `amplify/seed/data/users.json`, creates/signs in each Cognito user, adds Cognito groups if listed, then waits for (or falls back to manually creating) the `UserProfile` + personal workspace the post-confirmation trigger should already have made, and optionally creates a paid `WorkspaceSubscription` (real Stripe subscription + payment method) if the user entry has `planId`/`billingInterval`.

The Stripe products themselves come from a fixture file, `amplify/seed/data/stripe.json`, applied with the Stripe CLI's `stripe fixtures` command — it defines four products (Free, Starter, Pro, Enterprise) each with monthly/yearly prices. Typical sandbox flow:

```bash
# 1. Load demo products/prices into your Stripe test account
pnpm --filter @starter-nuxt-amplify-saas/backend run seed:stripe
# (equivalent: stripe fixtures amplify/seed/data/stripe.json --api-key $STRIPE_SECRET_KEY)

# 2. Sync SubscriptionPlan rows from what Stripe now has
pnpm --filter @starter-nuxt-amplify-saas/backend run seed:plans

# 3. Seed demo users (reads amplify/seed/data/users.json)
pnpm --filter @starter-nuxt-amplify-saas/backend run seed:users

# Or run both plans + users together:
pnpm --filter @starter-nuxt-amplify-saas/backend run seed
```

From the repo root these are also available as `pnpm backend:sandbox:seed`, `pnpm backend:sandbox:seed:plans`, `pnpm backend:sandbox:seed:users`.

## Scripts

All scripts are defined in `apps/backend/package.json`:

| Script | What it does |
|---|---|
| `deploy` | `ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID` — CI/CD branch deploy. |
| `sandbox:init` | `ampx sandbox` — start a local sandbox backend. |
| `sandbox:delete` | `ampx sandbox delete` — tear down the sandbox. |
| `sandbox:secrets` | Sets both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as sandbox secrets (see [Secrets](#secrets)). |
| `seed` | `ampx sandbox seed` — runs `amplify/seed/seed.ts`, task `all` (plans + users). |
| `seed:plans` | Same, with `SEED_TASK=plans` — syncs `SubscriptionPlan` from Stripe only. |
| `seed:users` | Same, with `SEED_TASK=users` — seeds `amplify/seed/data/users.json` only. |
| `seed:stripe` | `stripe fixtures amplify/seed/data/stripe.json --api-key $STRIPE_SECRET_KEY` — loads demo products/prices into Stripe. |
| `sandbox:stripe:seed` | `stripe fixtures --api-key $STRIPE_SECRET_KEY` — generic fixtures runner (no fixture file argument). |
| `sandbox:generate-outputs` | `ampx generate outputs` — regenerate `amplify_outputs.json` for the sandbox. |
| `sandbox:generate-graphql-client-code` | `ampx generate graphql-client-code` — regenerate typed GraphQL client code. |
| `generate-outputs` | Same as above, scoped to a deployed `$AWS_BRANCH`/`$AWS_APP_ID`. |
| `generate-graphql-client-code` | Same as above, scoped to a deployed branch. |
| `stripe:listen` | `stripe listen --forward-to "$STRIPE_WEBHOOK_URL"` — forwards Stripe test events to your sandbox webhook (requires `STRIPE_WEBHOOK_URL` env var set to `custom.stripeWebhookUrl`). |

From the repo root, most of these are exposed with a `backend:` prefix, e.g. `pnpm backend:sandbox:init`, `pnpm backend:sandbox:delete`, `pnpm backend:sandbox:secrets`.

## Secrets

Two Amplify secrets are required for billing to work: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

**Sandbox** — set both with one command (quoted verbatim from `apps/backend/package.json`):

```bash
printf %s "$STRIPE_SECRET_KEY" | pnpm exec ampx sandbox secret set STRIPE_SECRET_KEY && printf %s "$STRIPE_WEBHOOK_SECRET" | pnpm exec ampx sandbox secret set STRIPE_WEBHOOK_SECRET
```

Run it via `pnpm backend:sandbox:secrets` (from the repo root) with `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` already exported in your shell environment.

**Deployed branches (production/staging)** — set both secrets in the Amplify Console: **App Settings → Secrets**, per branch, before deploying.

## Registering the Stripe Webhook

`stripe-webhook`'s public Function URL is exported at deploy time as `custom.stripeWebhookUrl` in the generated `apps/backend/amplify_outputs.json` (see `backend.addOutput(...)` in `amplify/backend.ts`). Registering it with Stripe is a **manual operator step** — it is not automated by any deploy script:

- **Local sandbox development**: run `pnpm --filter @starter-nuxt-amplify-saas/backend run stripe:listen` with `STRIPE_WEBHOOK_URL` set to the `custom.stripeWebhookUrl` value — this uses the Stripe CLI to forward test events to your sandbox.
- **Deployed environments**: add the URL as an endpoint in the Stripe Dashboard (Developers → Webhooks), selecting at least `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`. Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET` for that branch.

Until the webhook is registered, Stripe-driven subscription updates (upgrades, cancellations, payment failures) will not reach `WorkspaceSubscription` — the checkout/portal flows will still redirect correctly, but the DB row won't update until Stripe successfully delivers events to a registered endpoint.
