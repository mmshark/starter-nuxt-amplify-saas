# Remediation Implementation Plan — starter-nuxt-amplify-saas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the starter kit back to an installable, deployable, and secure baseline by fixing every defect surfaced in the 2026-07-07 review — the monorepo naming/install break, the data-layer authorization hole, the incoherent billing model, the broken auth/workspaces/entitlements/UI code, dependency drift, and missing tooling/docs. This plan explicitly **excludes net-new features** (email, notifications, onboarding, social login, storage, etc.).

**Architecture:** pnpm monorepo composing Nuxt 4 apps from Nuxt Layers over an AWS Amplify Gen2 backend (Cognito + AppSync/DynamoDB), Stripe portal-first billing. Fixes are sequenced so the repo installs and builds first (Phase 0–1), then the security-critical data/billing model is redesigned (Phase 2–3), then broken code paths are repaired (Phase 4–6), then hygiene and docs (Phase 7–9).

**Tech Stack:** pnpm 10, Nuxt 4, Vue 3.5, TypeScript 5.9, `@nuxt/ui` v4, aws-amplify 6, `@aws-amplify/backend` 1.x, Stripe (node) 17→18, Zod 4, Playwright, Vitest (added in Phase 8).

## Global Constraints

- **Canonical package naming (decided):** every layer package is named `@mmshark/<layer>-layer` (matches the publish workflow and `doc/guides/using-published-layers.md`). The three apps keep `@starter-nuxt-amplify-saas/{backend,saas,landing}`. All `package.json` `name`, all `workspace:*` deps, all `nuxt.config` `extends`, all cross-layer deep imports, and all root `--filter` scripts MUST use these names. No other scheme may appear anywhere in source or docs.
- **Node:** `>=20.19` everywhere (`engines`, README, AGENTS.md). Remove the "Node >= 18" claim.
- **Nuxt UI:** `@nuxt/ui` v4 (MIT). Valid `color` values are exactly `primary | secondary | success | info | warning | error | neutral`. No `red/green/blue/yellow/gray/orange/black/purple`. No `@nuxt/ui-pro` references, no "Pro/paid" copy.
- **Data authorization:** `defaultAuthorizationMode` MUST be `userPool`. `allow.publicApiKey()` may appear ONLY as read-only (`.to(['read'])`) on `SubscriptionPlan`. All privileged server writes go through IAM auth (`allow.resource()` for the post-confirmation function, and `authMode: 'iam'` from Nitro server routes). No unrestricted `publicApiKey()` anywhere.
- **Server-side auth is mandatory for every mutating route.** No route may trust a client-supplied `workspaceId`/`priceId`/`planId` without verifying membership/role and looking the value up server-side.
- **Commit discipline:** Conventional Commits (`doc/adr/patterns/git-conventions.pattern.md`), one commit per task, scope from the approved list (`billing`, `auth`, `workspaces`, `entitlements`, `amplify`, `uix`, `saas`, `i18n`, `debug`, `deps`, `docs`).
- **Verification is evidence-based:** a task is done only when its stated command prints the expected output. "Should work" is not done.

---

## Phase 0 — Make the repo installable again

The repo does not `pnpm install` at HEAD because three package-naming schemes coexist. Nothing else can be verified until this is fixed. There is no meaningful unit test here; the "test" is a clean install + build.

### Task 0.1: Inventory the naming drift

**Files:**
- Read only: all `layers/*/package.json`, `apps/*/package.json`, all `*/nuxt.config.ts`, root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts/generate-layer-packages.js`.

- [ ] **Step 1: Enumerate every occurrence of the old scheme**

Run:
```bash
cd /Users/apuigsech/Develop/github.com/mmshark/starter-nuxt-amplify-saas
grep -rn "@starter-nuxt-amplify-saas/" --include=*.ts --include=*.json --include=*.vue --include=*.js \
  layers apps scripts package.json | grep -v "/backend" | grep -v "/saas\"" | grep -v "/landing"
```
Expected: a list of layer references still using `@starter-nuxt-amplify-saas/<layer>` (deps, extends, deep imports, root scripts). Save it; it is the worklist for 0.2–0.4.

- [ ] **Step 2: Confirm the canonical names exist**

Run: `grep -h '"name"' layers/*/package.json`
Expected: nine `@mmshark/<layer>-layer` names. These are the targets. Do not rename these.

### Task 0.2: Fix root workspace + scripts

**Files:**
- Modify: `pnpm-workspace.yaml`, root `package.json`

- [ ] **Step 1: Remove the phantom `packages/*` glob**

In `pnpm-workspace.yaml`, delete the `- packages/*` line (no `packages/` dir exists). Keep `apps/*` and `layers/*`.

- [ ] **Step 2: Repoint root `--filter` scripts to real package names**

In root `package.json`, every script filtering a layer must use the app that owns the operation, not a nonexistent layer package. The amplify codegen/outputs scripts belong to the backend app now (layers have no scripts). Change:
```jsonc
// before
"amplify:sandbox:generate-outputs": "pnpm --filter @starter-nuxt-amplify-saas/amplify run sandbox:generate-outputs",
"amplify:sandbox:generate-graphql-client-code": "pnpm --filter @starter-nuxt-amplify-saas/amplify run sandbox:generate-graphql-client-code",
"amplify:generate-outputs": "pnpm --filter @starter-nuxt-amplify-saas/amplify run generate-outputs",
"amplify:generate-graphql-client-code": "pnpm --filter @starter-nuxt-amplify-saas/amplify run generate-graphql-client-code",
"billing:sandbox:stripe:seed": "pnpm --filter @starter-nuxt-amplify-saas/billing run sandbox:stripe:seed -- ../../apps/backend/amplify/seed/data/stripe.json",
"billing:stripe:listen": "pnpm --filter @starter-nuxt-amplify-saas/billing run stripe:listen",
```
to target `@starter-nuxt-amplify-saas/backend` and define the corresponding `sandbox:generate-outputs`, `sandbox:generate-graphql-client-code`, `generate-outputs`, `generate-graphql-client-code`, and `stripe:*` scripts in `apps/backend/package.json` (move the real `ampx generate` / `stripe listen` commands there). Verify each referenced script exists:
```bash
grep -o '"[a-z:-]*":' apps/backend/package.json
```
Expected: the four `*generate*` scripts and any stripe scripts you referenced are present.

### Task 0.3: Fix app dependencies and `extends`

**Files:**
- Modify: `apps/saas/package.json`, `apps/saas/nuxt.config.ts`, `apps/landing/package.json`, `apps/landing/nuxt.config.ts`

- [ ] **Step 1: Rename `workspace:*` deps to canonical names**

`apps/saas/package.json:32-33` → `"@mmshark/saas-layer": "workspace:*"`, `"@mmshark/debug-layer": "workspace:*"`. Apply the same rename to `apps/landing/package.json` (`@mmshark/amplify-layer`, `@mmshark/uix-layer`, plus any others it lists).

- [ ] **Step 2: Rename `extends` targets**

`apps/saas/nuxt.config.ts:9-12` → `extends: ['@mmshark/saas-layer', '@mmshark/debug-layer']`. Fix `apps/landing/nuxt.config.ts` similarly.

### Task 0.4: Fix cross-layer references and the package generator

**Files:**
- Modify: every layer file from the 0.1 worklist (deep imports + `extends` in `layers/*/nuxt.config.ts`), `scripts/generate-layer-packages.js`

- [ ] **Step 1: Rewrite intra-layer imports and extends**

Replace each `@starter-nuxt-amplify-saas/<layer>` with `@mmshark/<layer>-layer`, preserving subpaths. Examples from the review:
- `layers/entitlements/server/utils/getWorkspaceContext.ts:10`: `@starter-nuxt-amplify-saas/workspaces/types/workspaces` → `@mmshark/workspaces-layer/types/workspaces`
- `layers/amplify/server/utils/amplify.ts:12`: `@starter-nuxt-amplify-saas/backend/schema` stays (it's the backend app — verify it resolves via the backend `exports`).
- Each `layers/*/nuxt.config.ts` `extends: ['@starter-nuxt-amplify-saas/uix', ...]` → `['@mmshark/uix-layer', ...]`.

- [ ] **Step 2: Ensure each layer `package.json` `exports` the subpaths consumers use**

For any deep import (`@mmshark/<layer>-layer/server/utils/...`, `/types/...`, `/config/...`), confirm the layer's `package.json` has a matching `exports` entry (wildcard `"./*": "./*"` is acceptable for a source-consumed layer). Add missing ones.

- [ ] **Step 3: Fix the generator so it stops reintroducing drift**

`scripts/generate-layer-packages.js`: peer versions must match reality (`0.1.0`, not `^1.0.0`) and emitted names must be `@mmshark/<layer>-layer`. Update the hardcoded values (lines ~47, ~55-56) and any name template.

### Task 0.5: Clean install + build gate

**Files:** none (verification only)

- [ ] **Step 1: Regenerate the lockfile from corrected manifests**

Run:
```bash
corepack enable
rm -rf node_modules pnpm-lock.yaml
pnpm install
```
Expected: install completes with no `ERR_PNPM_NO_MATCHING_VERSION` / unresolved `workspace:*` errors.

- [ ] **Step 2: Frozen-lockfile check (this is what CI/Amplify run)**

Run: `pnpm install --frozen-lockfile`
Expected: exits 0, "Lockfile is up to date".

- [ ] **Step 3: Build both apps** (backend outputs must already be generated; if not, this gates on Phase 1)

Run: `pnpm --filter @starter-nuxt-amplify-saas/saas build && pnpm --filter @starter-nuxt-amplify-saas/landing generate`
Expected: both builds succeed. If they fail only on missing `amplify_outputs.json`, note it and proceed to Phase 1, then return.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "fix(deps): unify layer package naming to @mmshark/*-layer so the monorepo installs"
```

---

## Phase 1 — CI gate (lock the door behind you)

Add CI now so every later phase is verified automatically and the "doesn't install" regression can't recur.

### Task 1.1: Install + typecheck + build workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the workflow**
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [master]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck
      - run: pnpm --filter @starter-nuxt-amplify-saas/saas build
      - run: pnpm --filter @starter-nuxt-amplify-saas/landing generate
```

- [ ] **Step 2: Add the missing `typecheck` script**

`apps/saas/package.json` scripts: `"typecheck": "nuxt typecheck"`. Add `nuxt typecheck` dev dependency prerequisites if `vue-tsc` isn't already transitively present (Nuxt provides it via `nuxt typecheck`).

- [ ] **Step 3: Verify locally**

Run: `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck`
Expected: it runs (it will surface real type errors that later tasks fix — that's expected; record the baseline count).

- [ ] **Step 4: Commit**
```bash
git add .github/workflows/ci.yml apps/saas/package.json
git commit -m "ci: add install+typecheck+build workflow"
```

---

## Phase 2 — Data-layer authorization (the security-critical fix)

Today `defaultAuthorizationMode: "apiKey"` + unrestricted `allow.publicApiKey()` ships a world-writable API key in the browser bundle. This phase closes it. **This is the single most important change in the plan.**

**Design decision:** client reads go through `userPool` owner/membership rules; privileged server writes (post-confirmation trigger, workspace/member/invitation/subscription mutations, Stripe webhook) run from Nitro server routes using `authMode: 'iam'`, with an IAM policy granting the app's server role access. `SubscriptionPlan` stays publicly *readable* (landing page needs it) via a read-only API key. Membership-aware read authorization on `Workspace`/`WorkspaceMember` is done with a **custom Lambda authorizer** (borrowed from `ontopix/app`) — but to keep this plan self-contained and avoid a net-new subsystem, the interim, secure approach is: **client never reads workspace tables directly; all workspace/member/subscription reads go through Nitro routes using IAM**, and the models allow only `owner` + `resource` (function) access. This removes the public key entirely without shipping a Lambda authorizer.

### Task 2.1: Grant the backend server role IAM access to Data

**Files:**
- Modify: `apps/backend/amplify/backend.ts`, `apps/backend/amplify/data/resource.ts`

**Interfaces:**
- Produces: an IAM auth mode enabled on the Data API and a server role ARN the Nitro layer will assume via Amplify SSR credentials.

- [ ] **Step 1: Enable `iam` (identityPool) auth mode + userPool default**

`apps/backend/amplify/data/resource.ts:132-140`:
```ts
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: { expiresInDays: 365 }, // read-only public plans only
  },
});
```

- [ ] **Step 2: Ensure identity-pool/IAM is configured in auth**

In `apps/backend/amplify/auth/resource.ts`, confirm `identityPoolId` is provisioned (Amplify Gen2 provisions one by default with `defineAuth`). The guest/auth IAM roles are what Nitro will use via `createAWSCredentialsAndIdentityIdProvider` (already wired in `layers/amplify/server/utils/amplify.ts`).

### Task 2.2: Rewrite every model's authorization rules

**Files:**
- Modify: `apps/backend/amplify/data/resource.ts`

- [ ] **Step 1: Replace all `publicApiKey()` grants**

Apply exactly:
```ts
UserProfile: userProfileModel.authorization((allow) => [
  allow.ownerDefinedIn("userId").to(["read"]),
  allow.authenticated('identityPool').to(["read", "create", "update"]), // server (IAM) privileged
]),

SubscriptionPlan: subscriptionPlanModel.authorization((allow) => [
  allow.publicApiKey().to(["read"]),          // landing page, read-only
  allow.authenticated().to(["read"]),
  allow.groups(["admin"]).to(["create", "update", "delete"]),
]),

Workspace: /* model */ .authorization((allow) => [
  allow.ownerDefinedIn('ownerId').to(['read']),
  allow.authenticated('identityPool'),        // full CRUD for server (IAM) only
]),

WorkspaceSubscription: /* model */ .authorization((allow) => [
  allow.authenticated('identityPool'),        // webhook + server writes via IAM
]),

WorkspaceMember: /* model */ .authorization((allow) => [
  allow.ownerDefinedIn('userId').to(['read']),
  allow.authenticated('identityPool'),
]),

WorkspaceInvitation: /* model */ .authorization((allow) => [
  allow.authenticated('identityPool'),        // never client-readable; server routes only
]),
```
Note: `allow.authenticated('identityPool')` restricts to IAM-credentialed principals (the server role and signed-in identities), not the public API key. Combined with client code that only calls Nitro routes, tenant data is never exposed to an unauthenticated caller.

- [ ] **Step 2: Delete the `resource.ts:83` TODO comment** (now resolved) and the stale `stripeCustomerId` secondary-index comment if the customer model changes in Phase 3.

### Task 2.3: Switch server routes to IAM data client

**Files:**
- Modify: `layers/amplify/server/utils/amplify.ts` (add `getServerIamDataClient`), every workspaces/billing server route that used `getServerPublicDataClient`

**Interfaces:**
- Produces: `getServerIamDataClient(): DataClient` using `authMode: 'iam'`, called inside `withAmplifyAuth`/`withAmplifyPublic` context.

- [ ] **Step 1: Add the IAM client factory**

In `layers/amplify/server/utils/amplify.ts` (after `getServerUserPoolDataClient`, line 332):
```ts
export const getServerIamDataClient = () =>
  generateClient<Schema>({ config: amplifyConfig, authMode: 'iam' })
```

- [ ] **Step 2: Replace `getServerPublicDataClient()` usages for tenant writes**

Grep and swap:
```bash
grep -rln "getServerPublicDataClient" layers apps
```
For workspace/member/invitation/subscription operations, use `getServerIamDataClient()` inside `withAmplifyPublic(...)` (the SSR context still supplies IAM creds via the identity pool). Keep `getServerPublicDataClient()` only for `SubscriptionPlan` reads (the public plans endpoint).

### Task 2.4: Deploy to sandbox and prove the hole is closed

**Files:** none (verification)

- [ ] **Step 1: Deploy**

Run: `pnpm backend:sandbox:init && pnpm amplify:sandbox:generate-outputs && pnpm amplify:sandbox:generate-graphql-client-code`
Expected: deploy succeeds; outputs regenerate.

- [ ] **Step 2: Prove anonymous API-key writes are rejected**

With the API key + endpoint from `apps/backend/amplify_outputs.json`, attempt an unauthenticated GraphQL mutation against `Workspace` (create) and a `WorkspaceMember` list:
```bash
# expected: authorization error, NOT data
curl -s "$APPSYNC_URL" -H "x-api-key: $API_KEY" -H 'content-type: application/json' \
  -d '{"query":"mutation{createWorkspace(input:{name:\"x\",slug:\"x\",ownerId:\"x\"}){id}}"}'
```
Expected: `Not Authorized to access createWorkspace` (or similar). A `SubscriptionPlan` list with the key MUST still return data (read-only public).

- [ ] **Step 3: Prove the app still works** (signed-in user can load workspaces via Nitro)

Run `pnpm saas:dev`, sign in, confirm workspace list/switcher populate (depends on Phase 4 fix too; if it fails only on the `useWorkspaces` shape bug, note and continue).

- [ ] **Step 4: Commit**
```bash
git add apps/backend/amplify/data/resource.ts apps/backend/amplify/backend.ts layers/amplify/server/utils/amplify.ts layers/workspaces layers/billing
git commit -m "fix(amplify): remove public apiKey CRUD, enforce userPool+IAM data authorization"
```

---

## Phase 3 — Billing model coherence

The Stripe customer is created per-user but subscriptions are per-workspace, so the webhook applies plans to the wrong workspace (or never syncs new workspaces). Fix the customer↔workspace mapping, then the endpoints and enforcement.

### Task 3.1: One Stripe customer per workspace

**Files:**
- Modify: `apps/backend/amplify/auth/post-confirmation/handler.ts`, `layers/workspaces/server/api/workspaces/index.post.ts`, `layers/billing/server/api/billing/checkout.post.ts`

**Interfaces:**
- Produces: every `Workspace` has a `WorkspaceSubscription` row whose `stripeCustomerId` is unique to that workspace; checkout stamps `subscription_data.metadata.workspaceId`.

- [ ] **Step 1: Create a customer + free subscription when a workspace is created**

In `workspaces/index.post.ts`, after the `Workspace.create`, create a Stripe customer (`stripe.customers.create({ metadata: { workspaceId } }, { idempotencyKey: workspaceId })`) and a `WorkspaceSubscription` row (`planId: 'free'`, `stripeCustomerId`). Move this shared logic into a helper `ensureWorkspaceBilling(workspaceId)` in `layers/billing/server/utils/`.

- [ ] **Step 2: Use the same helper in post-confirmation for the personal workspace**

Replace the per-user customer creation in `handler.ts` with `ensureWorkspaceBilling(personalWorkspaceId)`, keyed idempotently on the workspace id (fixes the retry-duplicates-customer bug, review M2).

- [ ] **Step 3: Stamp workspace on the subscription in checkout**

`checkout.post.ts`: add `subscription_data: { metadata: { workspaceId } }` and set the session `customer` to the workspace's `stripeCustomerId` (looked up server-side, not from the body).

### Task 3.2: Authorize checkout and validate the price

**Files:**
- Modify: `layers/billing/server/api/billing/checkout.post.ts`

- [ ] **Step 1: Verify OWNER membership before creating a session**

At the top of the handler, resolve the caller via `withAmplifyAuth`, load their membership in `workspaceId`, and `throw createError({statusCode: 403})` unless role is `OWNER`. Reuse the entitlements `requirePermission('manage-billing')` once Phase 5 lands; until then inline the check.

- [ ] **Step 2: Look up `priceId` server-side**

Do not accept `priceId` from the body. Accept `planId` + `billingInterval`, load the `SubscriptionPlan`, and read `stripeMonthlyPriceId`/`stripeYearlyPriceId`. Reject unknown plans with 400.

- [ ] **Step 3: Derive redirect URLs from config, not headers**

Replace host/`x-forwarded-*`-derived `success_url`/`return_url` (review M3) with a configured base URL from `runtimeConfig.public.appBaseUrl`. Do the same in `portal.post.ts`; stop accepting arbitrary `return_url`/`configuration_id` from the client.

### Task 3.3: Harden the webhook

**Files:**
- Modify: `layers/billing/server/api/billing/webhook.post.ts`

- [ ] **Step 1: Resolve workspace from subscription metadata**

In `handleSubscriptionUpdated/Deleted`, read `subscription.metadata.workspaceId` (now set in 3.1) instead of listing by `stripeCustomerId` and taking `data[0]`.

- [ ] **Step 2: Fail loudly on sync errors**

`upsertWorkspaceSubscription` returning `false` must cause the handler to `throw createError({ statusCode: 500 })` so Stripe retries (review H4). Do not return `{received:true}` on a failed write.

- [ ] **Step 3: Idempotency + ordering guard**

Persist processed `event.id`s (a small `ProcessedStripeEvent` model or a dedup on `stripeSubscriptionId + event.created`); ignore an event whose `event.created` is older than the stored `updatedAt`. Map `subscription.status` through a whitelist that matches the schema enum; drop/park unknown statuses instead of `as any` (review M5).

- [ ] **Step 4: Verify with the Stripe CLI**

Run: `pnpm billing:stripe:listen` then trigger `stripe trigger customer.subscription.updated`.
Expected: the correct workspace's `WorkspaceSubscription` updates; a forced DB failure returns 500 and Stripe shows a retry.

### Task 3.4: Scope portal + invoices to workspace, fix price display

**Files:**
- Modify: `layers/billing/server/api/billing/portal.post.ts`, `invoices.get.ts`, `layers/billing/components/{PricingPlan,PricingPlans,PricingTable}.vue`, `subscription.get.ts`, `layers/entitlements/types/entitlements.ts`, `layers/entitlements/config/features.ts`

- [ ] **Step 1: Resolve the customer from the workspace, with role check**

`portal.post.ts` and `invoices.get.ts`: use the `workspaceId`'s `WorkspaceSubscription.stripeCustomerId` (verify caller is OWNER/ADMIN of that workspace), not `UserProfile.stripeCustomerId` (review H5).

- [ ] **Step 2: Fix the 100× price bug**

Remove the `/ 100` in `formatPrice` in the three pricing components (seeder stores decimal dollars; review H1). Make `CurrentSubscription.vue` and the pricing components use one shared `formatPrice` util in `layers/billing/composables` so they can't diverge again.

- [ ] **Step 3: Add `starter` to the plan taxonomy**

`entitlements/types/entitlements.ts:10`: `Plan = 'free' | 'starter' | 'pro' | 'enterprise'`. Add a `starter` entry to `PLAN_FEATURES` in `config/features.ts`. Update the validation lists in `useEntitlements.ts:31` and `getWorkspaceContext.ts:69` (review H2).

- [ ] **Step 4: Remove dead billing code**

`invoices.get.ts` `getPaymentMethodInfo` (uses removed `PaymentIntent.charges`) → rewrite with `expand: ['data.payment_intent.latest_charge']` or delete if unused (review M1). `subscription.get.ts:131` `planFeatures = []` placeholder → populate from `PLAN_FEATURES` or remove.

- [ ] **Step 5: Commit**
```bash
git add layers/billing layers/entitlements apps/backend/amplify/auth/post-confirmation layers/workspaces/server/api/workspaces/index.post.ts
git commit -m "fix(billing): per-workspace customers, authorized checkout, hardened webhook, correct prices"
```

---

## Phase 4 — Workspaces & invitations repair

### Task 4.1: Fix the workspace-list shape bug

**Files:**
- Test: `layers/workspaces/composables/__tests__/useWorkspaces.test.ts` (new; Vitest from Phase 8 — if running before Phase 8, add the test file and wire Vitest first, or verify manually in-app and backfill the test)
- Modify: `layers/workspaces/composables/useWorkspaces.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect, vi } from 'vitest'
// mock $fetch to return { workspaces: [{id:'a'}], nextToken: null }
it('assigns the workspaces array, not the envelope', async () => {
  const { workspaces, loadWorkspaces } = useWorkspaces()
  await loadWorkspaces()
  expect(Array.isArray(workspaces.value)).toBe(true)
  expect(workspaces.value[0].id).toBe('a')
})
```

- [ ] **Step 2: Run — expect FAIL** (currently `workspaces.value` becomes the envelope object).

- [ ] **Step 3: Fix**

`useWorkspaces.ts:24-25`:
```ts
const result = await $fetch<{ workspaces: Workspace[]; nextToken: string | null }>('/api/workspaces')
workspaces.value = result.workspaces
```
Also fix `personalWorkspace` (line 16): compare against `user.value?.userId` (the user object exposes `userId`, not `id`).

- [ ] **Step 4: Run — expect PASS. Commit** `fix(workspaces): assign workspace array from paginated response envelope`.

### Task 4.2: Align the invitation schema with the code

**Files:**
- Modify: `apps/backend/amplify/data/resource.ts` (WorkspaceInvitation), then regenerate client code

- [ ] **Step 1: Add the missing fields**

The server writes `status` and `inviterEmail` that don't exist (review C2/C3). Add to `WorkspaceInvitation`:
```ts
status: a.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED']),
inviterEmail: a.email(),
```

- [ ] **Step 2: Regenerate + typecheck**

Run: `pnpm amplify:sandbox:generate-graphql-client-code && pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck`
Expected: the invite/accept/decline/list routes referencing `status`/`inviterEmail` now typecheck.

### Task 4.3: Secure the accept/decline flow

**Files:**
- Modify: `layers/workspaces/server/api/workspaces/[id]/invitations/[invitationId]/accept.post.ts`, `decline.post.ts`, `members/invite.post.ts`

- [ ] **Step 1: Verify the token on accept and decline**

Both handlers must require the `token` (from query/body) to match the stored invitation token, and 403 otherwise. The token is generated but never checked today (review H1). Compare with a constant-time check.

- [ ] **Step 2: Make the email check mandatory**

`accept.post.ts:62`: change `if (invitation.email && userEmail && invitation.email !== userEmail)` to reject when `userEmail` is missing or mismatched (case-insensitive). Restrict `decline` to the invitee or a workspace ADMIN/OWNER.

- [ ] **Step 3: Reject duplicate membership + guard the counter**

Before `WorkspaceMember.create`, check the user isn't already a member; increment `memberCount` with a conditional update (or recompute), not a read-modify-write (review H3). On workspace delete, cascade-delete invitations too.

- [ ] **Step 4: Prevent duplicate invites**

`invite.post.ts`: reject if an active membership or a PENDING invitation already exists for that email. Set `inviterEmail` from the caller's verified email; use a display name, not the Cognito UUID, for `inviterName`.

- [ ] **Step 5: Commit** `fix(workspaces): verify invitation tokens, enforce invitee identity, dedupe members`.

### Task 4.4: Member endpoint role correctness

**Files:**
- Modify: `layers/workspaces/server/api/workspaces/[id]/members/[userId].delete.ts`, `role.patch.ts`, `layers/workspaces/components/WorkspaceMembersList.vue`

- [ ] **Step 1: Align UI role options with the server enum**

`role.patch.ts` accepts `['ADMIN','MEMBER']`; the UI offers "Owner" (guaranteed 400, review M1). Remove "Owner" from the select, or implement an explicit ownership-transfer endpoint. Choose removal for this remediation (no new feature).

- [ ] **Step 2: Check mutation errors**

`role.patch.ts:84-87`: inspect the Amplify `errors` field and return 500 on failure instead of a silent `{success:true}`.

- [ ] **Step 3: Commit** `fix(workspaces): align member role options with server, surface mutation errors`.

---

## Phase 5 — Auth & entitlements enforcement

### Task 5.1: Make `requireAuth`/`withAuth` work in Nitro

**Files:**
- Modify: `layers/auth/server/utils/auth.ts`
- Modify: `layers/auth/composables/useUser.ts` (remove server misuse)

- [ ] **Step 1: Reimplement on top of `withAmplifyAuth`**

`requireAuth` currently calls `useUserServer().fetchUser()` → `useNuxtApp()`, which throws in server routes (review H4-auth). Rewrite:
```ts
import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
export const requireAuth = async (event) => {
  return await withAmplifyAuth(event, async (ctx) => {
    const { fetchAuthSession } = await import('aws-amplify/auth/server')
    const session = await fetchAuthSession(ctx)
    if (!session.tokens) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    const user = { userId: session.userSub, email: session.tokens.idToken?.payload.email as string }
    event.context.user = user
    return user
  })
}
```
`withAuth` stays a thin wrapper that calls `requireAuth` then the handler.

- [ ] **Step 2: Verify a protected route works**

Add a temporary `server/api/_authcheck.get.ts` using `withAuth`, hit it signed-out (expect 401) and signed-in (expect 200), then delete it.

- [ ] **Step 3: Commit** `fix(auth): implement server requireAuth via Amplify SSR context`.

### Task 5.2: Remove SSR token leakage

**Files:**
- Modify: `layers/auth/composables/useUser.ts`

- [ ] **Step 1: Move module-scope refs into `useState`**

Delete the module-level `_clientAuthSession`/`_clientTokens` refs (lines 7-8, 14-15) and the `createSharedComposable` wrapper (line 529). Store all state in per-request `useState`; skip storing JWTs on the server entirely (review H3). Guard any browser-only session cache with `import.meta.client`.

- [ ] **Step 2: Verify no cross-request bleed**

`pnpm saas:dev`, sign in as user A in one browser and user B in another (or two private windows), confirm SSR-rendered profile never shows the other user. Typecheck passes.

- [ ] **Step 3: Commit** `fix(auth): eliminate module-scope session state (SSR cross-request leak)`.

### Task 5.3: Fix MFA against Amplify v6

**Files:**
- Modify: `layers/auth/composables/useUser.ts`, `layers/auth/components/Authenticator.vue`

- [ ] **Step 1: Branch on `nextStep.signInStep`**

`signIn` (lines 164-183): read `{ isSignedIn, nextStep }`; `switch (nextStep.signInStep)` on `CONFIRM_SIGN_IN_WITH_SMS_CODE` / `CONFIRM_SIGN_IN_WITH_TOTP_CODE` / `DONE`, setting `authStep` accordingly. `confirmOTP` (line 275): call `confirmSignIn({ challengeResponse: code })`.

- [ ] **Step 2: Handle the challenge step in the component**

`Authenticator.vue`: render the OTP form when `authStep` is a `CONFIRM_SIGN_IN_*` state.

- [ ] **Step 3: Decision gate** — if MFA is out of scope to fully verify (no SMS/TOTP configured in Cognito), instead **remove** the dead MFA branches and mark MFA as a documented future feature. Pick one; do not leave v5-shaped dead code.

- [ ] **Step 4: Commit** `fix(auth): correct MFA challenge handling for aws-amplify v6` (or `chore(auth): remove non-functional v5 MFA scaffolding`).

### Task 5.4: Fix profile update + attribute shapes

**Files:**
- Modify: `layers/auth/composables/useUser.ts`, `layers/auth/components/{UserProfileSettings,UserAccountForm}.vue`

- [ ] **Step 1: Correct the mutation key and auth**

`updateUserProfile` (lines 443-451): send `userId`, not `id`; the mutation must run server-side via an IAM/Nitro route (owner has only `read` on `UserProfile` per Phase 2). Add a `PUT /api/profile` route that does the write with `getServerIamDataClient`.

- [ ] **Step 2: Unify `updateAttributes` shape**

Both call sites must pass `{ userAttributes: {...} }`. Fix `UserProfileSettings.vue:78`. Replace the `computed`-backed `v-model` (review M6) with a `reactive` copy + `watch`. Make server-side `updateAttributes` throw "not supported" instead of silently succeeding (review M7).

- [ ] **Step 3: Commit** `fix(auth): repair profile update mutation and attribute update shape`.

### Task 5.5: Activate server-side entitlements

**Files:**
- Modify: `layers/entitlements/server/utils/getWorkspaceContext.ts`, `layers/workspaces/server/middleware/auth.ts` (or make auth global), billing endpoints

- [ ] **Step 1: Authenticate inside `getWorkspaceContext`**

It reads `event.context.user`, set only for `/api/workspaces/*` (review C2). Call `requireAuth(event)` (Task 5.1) at the top so it works for all `/api/entitlements/*` and any `withFeature`/`withPermission` route.

- [ ] **Step 2: Require membership for plan derivation**

Return `plan: 'free'` when `membership` is null (review H6) — do not grant a workspace's plan to a non-member just because a cookie points at it.

- [ ] **Step 3: Enforce `manage-billing` on billing endpoints**

Wrap `checkout.post.ts`, `portal.post.ts` with `requirePermission('manage-billing')` (owner-only), replacing the inline check from Task 3.2.

- [ ] **Step 4: Verify**

Hit `/api/entitlements/*` signed-in from outside `/api/workspaces` — expect real data, not 401. Attempt checkout as a non-owner member — expect 403.

- [ ] **Step 5: Commit** `fix(entitlements): enforce server-side gating across all API routes`.

### Task 5.6: Remove entitlements SSR shared-state leak

**Files:**
- Modify: `layers/entitlements/composables/useEntitlements.ts`

- [ ] **Step 1:** Remove `createSharedComposable` (line 14); rely on the underlying `useState`-backed composables (review H3-entitlements). Verify typecheck + no cross-request bleed. Commit `fix(entitlements): drop createSharedComposable to avoid SSR state sharing`.

---

## Phase 6 — Frontend wiring & dead code

### Task 6.1: Move misplaced server routes

**Files:**
- Move: `apps/saas/app/server/api/*.ts` → `apps/saas/server/api/*.ts`

- [ ] **Step 1: Relocate**

Nuxt 4 scans `apps/saas/server/`, not `apps/saas/app/server/` (review C5). Move `customers.ts`, `mails.ts`, `notifications.ts`; delete the unused `members.ts`. These are dev mocks — keep them working so the demo pages render.

- [ ] **Step 2: Verify** `/api/notifications` etc. resolve in `pnpm saas:dev` (no 404). Commit `fix(saas): move server API routes to the directory Nuxt scans`.

### Task 6.2: Delete or repair the dead `layers/saas` shell

**Files:**
- Modify/Delete: `layers/saas/components/UserMenu.vue`, `layers/saas/pages/index.vue`, `layers/saas/layouts/dashboard.vue`

- [ ] **Step 1: Decide** — `apps/saas` shadows these with working versions, so the layer's shell is dead broken code (review H5). Delete the duplicated `UserMenu.vue`/`dashboard` shell and the broken `pages/index.vue`, OR repair them (`currentUser` not `user`, `UDropdownMenu` not `UDropdown`, `config.navigation.userMenu`, real routes). Prefer deletion unless the layer is meant to be consumed standalone (it is, per publishing) — in that case repair and add a smoke test. Given publishing intent, **repair**.

- [ ] **Step 2: Fix `definePageMeta`-in-layout no-ops**

`layers/saas/layouts/{dashboard,auth,onboarding}.vue` call `definePageMeta({ middleware })`, which does nothing in layouts (review H4-layouts). Move auth middleware to the pages, or register a global route middleware with an allowlist. Verify a protected page actually redirects when signed out.

- [ ] **Step 3: Verify + commit** `fix(saas): repair layer shell components and apply auth middleware correctly`.

### Task 6.3: Nuxt UI v4 color/prop sweep

**Files:**
- Modify: all files flagged in the review (workspaces components, saas pages, billing `UpgradePrompt.vue`, `forgot-password.vue`, debug pages, auth `Authenticator.vue`/`UserAccountForm.vue`/`UserProfileSettings.vue`)

- [ ] **Step 1: Find every invalid color + prop**
```bash
grep -rn "color=[\"']\(red\|green\|blue\|yellow\|gray\|orange\|black\|purple\)[\"']" layers apps
grep -rn "color: '\(red\|green\|blue\)'" layers apps    # toast calls
grep -rn "USelect[^>]*:options" layers apps             # v4 uses :items
```

- [ ] **Step 2: Replace** per the mapping: `red→error`, `green→success`, `blue→info`, `yellow/orange→warning`, `gray→neutral`, `USelect :options`→`:items`, `UDropdown`→`UDropdownMenu`.

- [ ] **Step 3: Verify** `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck` shows no color-type errors; spot-check toasts render. Commit `fix(uix): migrate colors and props to Nuxt UI v4 API`.

### Task 6.4: Debug layer safety

**Files:**
- Modify: `layers/debug/pages/debug/index.vue`, `debug/profile.vue`, `debug/users.vue`, `layers/debug/nuxt.config.ts`

- [ ] **Step 1: Stop rendering secret material** — remove the `runtimeConfig.stripe.secretKey.substring(0,12)` render (review M7). Fix the `useUser` destructures (`currentUser`/`loading`/`updateAttributes`). Remove or implement `/api/debug/users`. Add the `extends` the pages depend on. Ensure the whole layer is dev-only (`import.meta.dev` guard already 404s in prod — verify). Commit `fix(debug): stop leaking secrets, repair composable usage`.

---

## Phase 7 — Dependency updates

Do these in small, independently-verifiable commits; run typecheck + build after each.

### Task 7.1: Stripe SDK 17 → 18 (one major at a time)

**Files:** `apps/backend/package.json`, `layers/billing/package.json`, root `package.json`

- [ ] **Step 1:** Bump `stripe` to `^18` in all three; set the billing layer peer to `^18` and make it a direct dependency (review M2). Pin `apiVersion` to the version 18 expects. Run typecheck + the webhook CLI test from 3.3. Do NOT jump straight to 22 — step through majors, checking the changelog for breaking changes each time. Commit per major.

### Task 7.2: Framework + tooling bumps

**Files:** the workspace `package.json` files

- [ ] **Step 1:** Update within-safe ranges surfaced by `pnpm -r outdated`: `nuxt 4.2.1→4.4.x`, `@nuxt/ui 4.2→4.9`, `@vueuse/* 13→14`, `vue 3.5.21→3.5.x` (remove the pin if the SSR-dedup workaround is no longer needed — test `nitro.externals.inline` removal), `@nuxtjs/i18n` peer `^8`→ the installed major, `@aws-amplify/backend`/`aws-cdk-lib`/`constructs` to current 1.x/2.x. Resolve the zod 3/4 skew: standardize on zod 4 across workspaces. TypeScript 6 and vue-router 5 are majors — defer to a separate spike, note in docs.

- [ ] **Step 2:** After each cluster: `pnpm install && pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck && pnpm --filter @starter-nuxt-amplify-saas/saas build`. Commit `chore(deps): update <cluster>`.

### Task 7.3: Fix stale peers + seed data

**Files:** `layers/uix/package.json`, `layers/workspaces/package.json`, `apps/backend/amplify/seed/data/users.json`, `apps/backend/amplify/seed/seeders/users.ts`

- [ ] **Step 1:** `layers/uix` peers: `@nuxt/ui ^4`, `tailwindcss ^4`; drop `@nuxt/ui-pro`. `layers/workspaces` peer `zod ^4`. Update seed card `exp_year` from 2025 to a future year, or switch to `payment_method: 'pm_card_visa'` test tokens (review M4). Make the seeder idempotent (query by slug before create; poll for the trigger-created profile instead of `setTimeout`) (review M3). Commit `chore(deps): align peer ranges; fix expired seed cards`.

---

## Phase 8 — Tooling: lint + unit tests

### Task 8.1: ESLint flat config

**Files:** `eslint.config.mjs` (root), root `package.json`

- [ ] **Step 1:** Add `@nuxt/eslint` flat config at the root; add `"lint": "eslint ."` and `"lint:fix"`. Run `pnpm lint` — fix or `eslint-disable` with justification the initial findings. Add `- run: pnpm lint` to `ci.yml`. Commit `chore: add eslint flat config and wire into CI`.

### Task 8.2: Vitest + one exemplar test per kind

**Files:** `vitest.config.ts`, `apps/saas/package.json`, test files

- [ ] **Step 1:** Add `vitest` + `@nuxt/test-utils`. Write exemplar tests: one composable (`useWorkspaces` from Task 4.1 — backfill if deferred), one Nitro route with a mocked Amplify client (`checkout.post` authorization: non-owner → 403), one pure util (`formatPrice` from Task 3.4). Add `"test": "vitest run"` and `- run: pnpm test` to CI. Commit `test: add vitest with exemplar composable/route/util tests`.

### Task 8.3: Make the e2e suite loadable (don't fully green it)

**Files:** `apps/saas/package.json` scripts, `apps/saas/tests/e2e/playwright.config.js`, `apps/saas/tests/e2e/helpers/auth.js`

- [ ] **Step 1:** Add `--config tests/e2e/playwright.config.js` to every `test:e2e*` script (baseURL/projects currently never load, review M8). Remove the reference to the nonexistent `new-user.spec.js` or create the spec. Remove `rejectUnauthorized: false` (review M8 / security) — use a proper CA or the provider's TLS. Document that e2e requires a live sandbox + IMAP mailbox and keep it out of the default CI job (a separate, manually-triggered workflow). Commit `fix(saas): make e2e config load; document sandbox/e2e prerequisites`.

---

## Phase 9 — Documentation sync

Do this last so docs describe the now-correct code. Ordered by newcomer impact.

### Task 9.1: Fix the two flagship files

**Files:** `AGENTS.md`, `README.md`

- [ ] **Step 1: AGENTS.md** — replace all `doc/ard/` → `doc/adr/`; list all 9 layers in "Layers Overview" and the repository tree; delete the false "Known Limitations" (multi-tenancy/entitlements ARE implemented); fix the plans-seed workflow description (plans sync *from* Stripe; there is no `plans.json`); remove `tsx scripts/billing-stripe-sync.ts`; document the e2e scripts and the logger; update the naming guidance to `@mmshark/<layer>-layer`.
- [ ] **Step 2: README** — delete the "Billing Plans Configuration" section (removed flow); fix `pnpm saas:typecheck`→`typecheck`; "Node >= 18"→">= 20.19"; remove "Nuxt UI Pro (paid)"; correct the Stripe sandbox flow end-to-end (`billing:stripe:login` → `backend:sandbox:secrets` → `billing:sandbox:stripe:seed` → `backend:sandbox:seed:plans`).
- [ ] **Step 3: Verify** — run every `pnpm ...` command quoted in both files; each must exist and succeed (or be clearly marked as requiring a sandbox). Commit `docs: correct AGENTS.md and README to match current code`.

### Task 9.2: Delete/archive obsolete docs

**Files:** `doc/prd/{trpc,notifications,onboarding}.md`, `doc/plan/{trpc,notifications,onboarding,global}.md`, `doc/adr/patterns/trpc.pattern.md`

- [ ] **Step 1:** Move tRPC docs (feature removed) and notifications/onboarding docs (never built — these are *future features*, out of this plan's scope but their docs shouldn't read as current) to `doc/archive/`. Keep `trpc.pattern.md` archived with its deprecation banner. Rewrite `doc/plan/global.md` or archive it (2024 snapshot). Commit `docs: archive tRPC and unbuilt-feature documentation`.

### Task 9.3: Fix package names + errors across remaining docs

**Files:** `doc/adr/saas.md`, `doc/adr/saas-layer.md`, `doc/adr/patterns/{api-server,app-config-composition,navigation-config,repository-structure}.pattern.md`, `doc/prd/saas.md`

- [ ] **Step 1:** Global find/replace `@starter-nuxt-amplify-saas/<layer>` → `@mmshark/<layer>-layer` in these files. In `doc/adr/saas.md` remove the Onboarding/Notifications layers and the phantom `TRPC` node from the mermaid diagram; add `debug`. In `doc/prd/saas.md:147-148` fix `useGraphQL()`/`useTranslation()` → real APIs. Fix `repository-structure.pattern.md` (prescribes Taskfile/.infra/modules that don't exist). Commit `docs: correct package names and stale references in ADR/patterns`.

### Task 9.4: Fill documentation gaps

**Files:** `LICENSE`, `layers/workspaces/README.md`, `apps/backend/README.md`, `apps/saas/README.md`, `apps/landing/README.md`, `layers/amplify/README.md`, new `doc/guides/make-it-yours.md`

- [ ] **Step 1:** Add the `LICENSE` file (MIT, referenced but absent). Write `layers/workspaces/README.md` (12 routes, 4 composables, 5 components), `apps/backend/README.md` (data models, seed system, secrets). Replace the boilerplate app READMEs. Update `layers/amplify/README.md` to match real structure + document the logger. Write `doc/guides/make-it-yours.md`: how to rebrand the scopes, which files are instance-specific vs layer-owned, the sandbox/secrets/domain checklist. Commit `docs: add LICENSE, workspaces/backend READMEs, and a bootstrap guide`.

---

## Self-Review Checklist (run before executing)

- **Coverage:** every review finding maps to a task — install break (P0), CI gap (P1), data auth C1/C2 (P2), billing C1-H6/M1-M8 (P3), workspaces C3/C4/H1-H3/M1 (P4), auth H1-H6/M6-M7 + entitlements C2/H6 (P5), UI/dead code C5/H4-H5/M3/M7 (P6), deps M2/M4/M8-M9 (P7), tooling (P8), docs (P9). Missing features are intentionally excluded per the request.
- **Ordering:** install→CI→security→billing→repair→hygiene→docs. No task depends on a later one except the noted Vitest backfill (4.1 ↔ 8.2), which is called out.
- **Naming consistency:** every task uses `@mmshark/<layer>-layer` for layers and `@starter-nuxt-amplify-saas/{backend,saas,landing}` for apps.
- **No placeholders:** each code step shows the actual change or the exact grep/command to drive it.

## Execution Handoff

Two ways to run this:

1. **Subagent-Driven (recommended)** — one fresh subagent per task with review between tasks. Best for a plan this large and security-sensitive.
2. **Inline Execution** — batch phases in-session with checkpoints.

Note: Phases 2–3 require a deployable AWS sandbox (`pnpm backend:sandbox:init` + Stripe test keys) to verify. If that environment isn't available in the execution session, the code changes can still be made and typechecked, but the deploy/curl/webhook verification steps must be run wherever the sandbox lives.
