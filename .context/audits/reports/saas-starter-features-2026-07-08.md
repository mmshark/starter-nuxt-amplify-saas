# SaaS Starter — Audited Feature Report (2026-07-08)

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new

## Method

26 feature areas of the starter were audited against the codebase on 2026-07-08. Each area was
**independently assessed** (star ratings, implemented/missing inventory, evidence files, risks) and then
**adversarially verified** by a second pass that re-checked every claim against the code — greps, executed
tests and builds, reproduced failures, exact line references. Where the verifier disagreed, the verifier's
ratings are final (4 quality downgrades: Landing 2→1, File storage 2→1, Feature flags 3→2, DX 4→3).
All 26 verifications completed with **high confidence**.

**Scales**
- *Implementation* 1–5: 1 = absent · 2 = scaffolding/partial · 3 = functional core, notable gaps · 4 = near-complete · 5 = commercial-starter parity.
- *Quality* 0–5: rates what exists; **0 = nothing to assess** (area absent).
- *Priority*: High / Medium / Low. *Effort to close the gap*: S / M / L / XL.

**Reading notes**
- References to `doc/…` point to the **legacy documentation tree**, cited here as evidence of documentation
  drift; replacement docs live under `.context/`.
- This report is the evidence base cited by the [roadmap](../../roadmaps/20260711-saas-boilerplate-productization.md) and the
  [tech-debt ledger](../../architecture/tech-debt.md). It does not repeat their content.

## Summary

| # | Area | Impl. | Quality | Priority | Effort |
|---|---|---|---|---|---|
| 1 | [Authentication](#authentication) | 3/5 | 4/5 | High | L |
| 2 | [Profile & account](#profile--account) | 2/5 | 3/5 | High | L |
| 3 | [Multi-tenancy / Workspaces](#multi-tenancy--workspaces) | 3/5 | 4/5 | High | L |
| 4 | [Entitlements / RBAC / Feature gating](#entitlements--rbac--feature-gating) | 3/5 | 3/5 | High | L |
| 5 | [Billing & subscriptions (Stripe)](#billing--subscriptions-stripe) | 3/5 | 4/5 | High | L |
| 6 | [Landing / marketing site](#landing--marketing-site) | 2/5 | 1/5 | High | L |
| 7 | [UI kit / design system / theming](#ui-kit--design-system--theming) | 3/5 | 3/5 | Medium | L |
| 8 | [Internationalization](#internationalization) | 2/5 | 3/5 | Medium | L |
| 9 | [Transactional email](#transactional-email) | 1/5 | 1/5 | High | L |
| 10 | [In-app notifications](#in-app-notifications) | 2/5 | 2/5 | Medium | L |
| 11 | [Onboarding](#onboarding) | 2/5 | 2/5 | Medium | L |
| 12 | [Admin panel](#admin-panel) | 1/5 | 3/5¹ | Medium | XL |
| 13 | [Internal API layer](#internal-api-layer) | 3/5 | 4/5 | Medium | L |
| 14 | [File storage](#file-storage) | 2/5 | 1/5 | Medium | L |
| 15 | [Product analytics](#product-analytics) | 1/5 | 0 | Medium | M |
| 16 | [Feature flags / experiments](#feature-flags--experiments) | 2/5 | 2/5 | Low | L |
| 17 | [Observability](#observability) | 2/5 | 2/5 | High | L |
| 18 | [Testing](#testing) | 2/5 | 3/5 | High | L |
| 19 | [CI/CD & deployment](#cicd--deployment) | 2/5 | 2/5 | High | L |
| 20 | [Security & compliance](#security--compliance) | 3/5 | 4/5 | High | L |
| 21 | [DX, documentation & tooling](#dx-documentation--tooling) | 4/5 | 3/5 | Medium | M |
| 22 | [AI / LLM integration](#ai--llm-integration) | 1/5 | 0 | Medium | L |
| 23 | [Background jobs](#background-jobs) | 1/5 | 0 | Medium | M |
| 24 | [Customer support & feedback](#customer-support--feedback) | 1/5 | 1/5 | Medium | L |
| 25 | [Realtime / live updates](#realtime--live-updates) | 1/5 | 0 | Medium | L |
| 26 | [Email marketing](#email-marketing) | 1/5 | 0 | Medium | L |

¹ Admin quality rates the dev-only debug layer (the only tangential code); no operator panel exists.

## Verified integration bugs (cross-cutting)

The audit confirmed these concrete, reproducible defects. Phase 0 of the roadmap tracks their fixes.

| # | Bug | Where |
|---|---|---|
| 1 | Workspace cookie name mismatch: client writes `current-workspace-id`, entitlements reads `currentWorkspaceId` — server entitlement checks without an explicit workspaceId always resolve plan `free` / role `user` | `layers/workspaces/composables/useWorkspaces.ts`, `layers/entitlements/server/utils/getWorkspaceContext.ts` |
| 2 | Client subscription never hydrated: `GET /api/workspaces` omits `subscription`, so `useEntitlements().subscriptionPlan` always resolves `free` client-side | `layers/workspaces/server/api/workspaces/index.get.ts`, `layers/entitlements/composables/useEntitlements.ts` |
| 3 | Broken navigation targets: `/upgrade` (feature + requirePlan middlewares), `/dashboard` (permission middleware), `/billing` (UpgradePrompt; real page is `/settings/billing`), `/pricing` (checkout `cancel_url`) — all 404 | `layers/entitlements/middleware/*.ts`, `layers/entitlements/components/UpgradePrompt.vue`, `layers/billing/server/api/billing/checkout.post.ts` |
| 4 | Email change without verification: form submits `updateAttributes({email})` and shows success, but no `confirmUserAttribute` flow exists and the Cognito `nextStep` is discarded | `layers/auth/components/UserAccountForm.vue`, `layers/auth/composables/useUser.ts` |
| 5 | Ghost forms: password-change form has no `@submit` handler and "Delete account" button has no handler — both look functional | `layers/saas/pages/profile/security.vue` |
| 6 | Unauthenticated template demo endpoints serving mock data in the production app | `apps/saas/server/api/customers.ts`, `apps/saas/server/api/mails.ts`, `apps/saas/server/api/notifications.ts` |
| 7 | Seeder silently never creates subscriptions: requires `planId && billingInterval` but no fixture user defines `billingInterval` | `apps/backend/amplify/seed/seeders/users.ts`, `apps/backend/amplify/seed/data/users.json` |
| 8 | Dead seed script: `sandbox:amplify:seed` runs `tsx scripts/amplify-seed.ts` but `apps/backend/scripts/` does not exist; invoked from the root package | `apps/backend/package.json` |
| 9 | `/debug` checkout tooling reads `appConfig.billing.plans`, which no layer defines — always empty | `layers/debug/pages/debug/index.vue` |
| 10 | CI/build cannot pass on a clean checkout: static import of gitignored `amplify_outputs.json`, layer tsconfig referencing ungenerated `.nuxt` files, 341 typecheck errors; `ci.yml` exists only on a local branch and has zero recorded runs | `layers/amplify/plugins/01.amplify.client.ts`, `layers/amplify/tsconfig.json`, `.github/workflows/ci.yml` |

---

## Authentication

**Implementation 3/5 · Quality 4/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- Email+password core on Cognito (Amplify Gen2): `defineAuth` with email login and least-privilege grants
  (`apps/backend/amplify/auth/resource.ts`); post-confirmation Lambda creates UserProfile, personal workspace,
  per-workspace Cognito groups (idempotent) and Stripe customer (`apps/backend/amplify/auth/post-confirmation/handler.ts`).
- `layers/auth`: universal `useUser()`/`useUserServer()` (signUp/signIn/signOut/reset/confirm/updateAttributes/fetch)
  SSR-safe via `useState`, JWTs never serialized into the SSR payload; multi-step `Authenticator.vue`
  (signin/signup/verify, code resend, zod); SSR-compatible `auth`/`guest` middlewares with open-redirect protection
  (`layers/auth/utils/index.ts`); 30-min session refresh (`layers/auth/plugins/auth.client.ts`); server
  `requireAuth`/`withAuth` (`layers/auth/server/utils/auth.ts`); `GET /api/profile` works, `PUT /api/profile` is a
  deliberate, documented fail-closed 501.
- Per-request Cognito cookie adapter (`layers/amplify/plugins/01.amplify.server.ts`); auth pages under
  `layers/saas/pages/auth/`; Cognito error mapping; Playwright e2e for signin/signup with **real** email verification
  via Gmail IMAP (`apps/saas/tests/e2e/helpers/auth.js`).

**Missing**
- MFA/TOTP entirely absent (no config, no `confirmSignIn`, no OTP UI). Social login absent (no `externalProviders`;
  the Authenticator `providers` prop is an empty passthrough). Magic links / email-OTP sign-in absent.
- No in-session password change (`updatePassword`) or account deletion (`deleteUser`). "Remember me" is decorative.
  Default Cognito emails (no SES/branding). No abuse protection beyond Cognito defaults.
- No unit tests for the layer; e2e limited to signin/signup (no reset/logout/route-protection specs).
  `doc/prd/auth.md` documents MFA, `jose` JWT validation and dual token storage that **do not exist**.

**Verifier corrections**
- Broken flow the assessor missed: `layers/auth/components/UserAccountForm.vue` submits an email change but no
  `confirmUserAttribute`/`sendUserAttributeVerificationCode` flow exists anywhere — email change is broken, and it
  contradicts `UserProfileSettings.vue`, which marks email immutable.
- In the repo's favor: logout **is** wired in the product UI (both UserMenus); the signup e2e does real inbox
  verification. Conditional early-returns that can pass without validating apply mainly to `signin.spec.js`.
- Dead code: `isProtectedRoute` exported but unused; the public-routes list references `/auth/verify` and
  `/auth/reset-password` pages that do not exist (verification happens inline in the Authenticator).

**Risks**
- Cognito tokens (incl. refresh token) live in non-HttpOnly cookies (inherent to the Amplify JS SSR adapter):
  an XSS exfiltrates the full session.
- post-confirmation swallows all errors: a user can end up confirmed without profile/workspace/Stripe customer,
  with no retry or compensation.
- Legacy gap analysis scores auth ~95% — optimistic; auth middleware fetches user+profile on every navigation.

## Profile & account

**Implementation 2/5 · Quality 3/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- Full navigation shell: `layers/saas/pages/profile.vue` + 4 subpages, wired from `layers/saas/config/navigation.ts`.
- Working name editing: `layers/auth/components/UserProfileSettings.vue` (zod + UForm) →
  `updateAttributes` (Cognito `given_name`/`family_name`), change detection, toasts.
- `GET /api/profile` authenticated via `requireAuth` against the owner-read-only `UserProfile` model
  (`apps/backend/amplify/data/resource.ts`); `PUT /api/profile` deliberate fail-closed 501.

**Missing**
- Password change: `layers/saas/pages/profile/security.vue` is a stub — the form has no `@submit`, `Auth.updatePassword`
  is called nowhere; the "Update" button does nothing.
- Account deletion: button without handler; no `deleteUser`, no cleanup Lambda (workspaces, `ws:*` groups, Stripe).
- Email change incomplete (bug #4 above). Avatar upload nonexistent (no storage backend; avatars generated by the
  external service ui-avatars.com in `apps/saas/app/components/UserMenu.vue`).
- Preferences: `profile/notifications.vue` is hardcoded local state with a TODO; `UserProfile` has no preferences
  field and no privileged write path. No tests for the area; strings hardcoded in English despite the i18n layer.

**Verifier corrections**
- A complete two-step password **reset** flow exists (`layers/saas/pages/auth/forgot-password.vue`) but it has
  `guest` middleware — it is not an in-session change; the security-page stub remains dead UI.
- Aggravating: `useUser.updateAttributes` discards the Amplify return value, losing the
  `CONFIRM_ATTRIBUTE_WITH_CODE` next step — the UI cannot even detect that verification is required.
- The layer `UserMenu.vue` (reads a never-set `picture` attribute) is shadowed by the app component; the rendered
  one is the ui-avatars.com leaker.
- The legacy gap analysis marks this area "fully implemented" (password/2FA marked ✅) — false.

**Risks**
- Two forms pretend to work (password change, account deletion) — users may believe they changed their password.
- Misleading success toast on email change can leave Cognito accounts inconsistent (unverified login identifier).
- Name/email leak to ui-avatars.com (privacy + external dependency). Future account deletion is non-trivial
  (coordinated cleanup via a privileged Lambda). Test coverage of the area: zero.

## Multi-tenancy / Workspaces

**Implementation 3/5 · Quality 4/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- Complete multi-tenant data model (`Workspace`, `WorkspaceMember`, `WorkspaceInvitation`, `WorkspaceSubscription`)
  with group-per-workspace isolation: two Cognito groups per workspace, tenant tables client-read-only, **all**
  writes via the privileged `workspace-membership` Lambda (9 actions) —
  `apps/backend/amplify/data/resource.ts`, `apps/backend/amplify/functions/workspace-membership/handler.ts`.
- The Lambda verifies the caller's access token with Cognito `GetUser`, compares invitation tokens in constant time,
  forbids invitations from granting OWNER, re-verifies invitation provenance, self-corrects `memberCount`, and rolls
  back groups/rows/billing on failure. Only the authenticated Identity Pool role may invoke it
  (`apps/backend/amplify/backend.ts`).
- 11 Nitro routes under `/api/workspaces/**` with zod + prefix auth middleware; composables (`useWorkspaces` with
  cookie + post-create session force-refresh, `useWorkspaceMembers` with optimistic updates); switcher, members list,
  invite modal; `/settings/workspaces` and `/settings/members` pages; personal workspace auto-created at signup.

**Missing**
- Invitation flow **unusable end-to-end**: no email sending anywhere in the repo, no acceptance page (accept/decline
  endpoints have no UI consumer), no "my pending invitations" view, no revocation button (backend supports it).
- No ownership transfer (`updateMemberRole` accepts only ADMIN|MEMBER). No "leave workspace". No slug-uniqueness check
  (defined secondary index unused). No per-plan workspace limits. PRD-specified `workspace*` middlewares and
  `requireWorkspace*` server utils do not exist. `deleteWorkspace` deletes the subscription row **without cancelling
  the Stripe subscription**.
- Tests: 1 unit file (2 cases), zero workspace e2e, Lambda untested.

**Verifier corrections**
- All key security claims verified against code with line references; no refutations.
- Cookie bug (#1 above) confirmed and scoped: broken consumers are `requireFeature`, `/api/entitlements/features`
  and `/check-feature`; billing flows unaffected (explicit `workspaceIdOverride`). Fail-closed, not a security hole.
- New: UI–backend inconsistency — the backend allows ADMIN to remove members, the UI restricts removal to OWNER
  (`layers/workspaces/components/WorkspaceMembersList.vue`).
- New minor: only `switchWorkspace` persists the workspace cookie (create/auto-select do not), so client state and
  cookie can diverge; `settings/members.vue` mounts two independent invite-modal instances.

**Risks**
- Invitation token (possession secret) returned to OWNER/ADMIN by `invitations.get.ts` — should be omitted.
- Deleted paid workspace keeps billing running in Stripe. Removed members keep the `cognito:groups` claim until token
  expiry (mitigated by row checks in routes). Membership checks and `memberCount` use DynamoDB Scan+filter instead of
  the defined indexes (cost/latency grows with volume). Workspace names leak to ui-avatars.com.
  Near-zero test coverage in a security-critical area.

## Entitlements / RBAC / Feature gating

**Implementation 3/5 · Quality 3/5 · Priority High · Effort L** — verifier kept ratings, "at the low end".

**Implemented**
- Dedicated layer: `useEntitlements()` (plan/role/feature checks, SSR-safe); declarative catalogs —
  10 features / 4 plans with inheritance (`layers/entitlements/config/features.ts`), 9 permissions / 3 roles
  (`config/permissions.ts`); `FeatureGate`/`PermissionGuard`/`UpgradePrompt` components; `feature`/`permission`/
  `requirePlan` route middlewares; server enforcement `getWorkspaceContext` (verifies real membership in DynamoDB,
  never trusts client input) + `requirePermission`/`requireFeature`/`requirePlan`; 4 API endpoints.
- Real production use: billing checkout/portal call `requirePermission('manage-billing', workspaceId)`
  (`layers/billing/server/api/billing/checkout.post.ts`, `portal.post.ts`). One passing unit test
  (`layers/entitlements/server/utils/__tests__/requirePermission.test.ts`).

**Missing**
- **Nothing in the app consumes** `FeatureGate`/`PermissionGuard`/`UpgradePrompt`/the middlewares — UI gating is
  unconsumed infrastructure.
- Client plan resolution broken (bug #2): `subscription` never hydrated → always `free` client-side.
- Broken denial-flow targets (bug #3). No usage quotas/metering. `FEATURES[x].enabled` is dead code.
  `requireFeature`/`requirePlan` lack the `workspaceIdOverride` parameter that `requirePermission` has.
  No per-request caching (each check costs up to 3 DynamoDB reads). No authorization-failure logging. Minimal tests.

**Verifier corrections**
- **New bug found by the verifier**: the cookie-name mismatch (#1) means all four `/api/entitlements*` endpoints and
  any `require*` call without explicit workspaceId always resolve `free`/`user` in a real session. Server-side gating
  works only on the explicit-workspaceId path (billing). Today with no impact — nothing calls `/api/entitlements*`.
- Upside missed: real role-based UI gating **does** exist, ad hoc via `useWorkspaceMembership`
  (settings pages, members list) — which also confirms the dual source of truth the assessor flagged.
- Same-class broken route added: checkout `cancel_url` → `/pricing` (no page).
- Even with the cookie name fixed, only `switchWorkspace` writes it — cookie-based server resolution stays unreliable.

**Risks**
- Whoever wires `FeatureGate`/middlewares without fixing hydration will block paid features for **all** users
  (silent UX regression). Denial flows end in 404. `getWorkspaceContext` silently degrades to free/user on
  infrastructure errors (masks real failures). Legacy gap analysis claims "~95% complete" — it measured file
  existence, not functional integration.

## Billing & subscriptions (Stripe)

**Implementation 3/5 · Quality 4/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- Workspace-first, portal-first billing. Checkout (`layers/billing/server/api/billing/checkout.post.ts`): server-side
  priceId lookup (client cannot inject prices), `requirePermission('manage-billing')`, promo codes,
  `metadata.workspaceId`. Portal (`portal.post.ts`): 4 flows, server-derived `return_url` (anti open-redirect);
  plan change/cancel delegated to the Stripe portal.
- Webhook Lambda via Function URL (`apps/backend/amplify/functions/stripe-webhook/handler.ts`): signature
  verification, idempotency (`ProcessedStripeEvent`), out-of-order guard, status whitelist, plan resolution by
  priceId, revert-to-free on `subscription.deleted`, 5xx responses to force Stripe retries.
- Plan sync from Stripe at seed time (`apps/backend/amplify/seed/seeders/plans.ts`); invoices API with cursor
  pagination + tax breakdown, OWNER/ADMIN-only (`invoices.get.ts`); subscription state endpoint + `useBilling()`
  (request dedupe, per-workspace state); idempotent `ensureWorkspaceBilling`
  (`layers/billing/server/utils/ensureWorkspaceBilling.ts`); Lambda-only writes; `/settings/billing` page.

**Missing**
- **Free→paid upgrade broken end-to-end**: pricing components (`layers/billing/components/PricingPlans.vue` et al.)
  mounted nowhere, no `/pricing` route (checkout `cancel_url` → 404), and "Change Plan" opens the portal, which
  cannot start a first subscription for a free workspace.
- No Stripe Tax (`automatic_tax` absent). Trials data-level only (no `trial_period_days`, no UI). Dunning:
  `invoice.payment_failed` only logged — no emails, no in-app banner, no grace logic. No usage-based billing.
  Plan sync only at seed time (no `product.updated`/`price.updated` handling). Card-only payments.
  PRD-promised zod validation absent. Mostly hardcoded English strings despite en/es locale files.
  `layers/billing/README.md` describes an obsolete architecture (Nuxt 3, webhook in the layer, per-user billing).

**Verifier corrections**
- **Factual error in the assessment**: "zero e2e" is false — Playwright covers billing
  (`apps/saas/tests/e2e/specs/layers/billing/plans.spec.js`: 4 tests; `specs/flows/new-user-journey.spec.js`:
  payment-method setup and Pro upgrade via the portal; ~1,400-line Stripe helpers). The **webhook** still has no
  tests of any kind.
- Latent bug found: the `ensureWorkspaceBilling` rollback deletes the Stripe customer, but Stripe idempotency-key
  replay (~24 h) would return the deleted customer's id on retry → invalid `stripeCustomerId`.
- Seed inconsistency: the users seeder builds `WorkspaceSubscription` from the user-level Stripe customer instead of
  the workspace-level one (seed data only). Minor: `trialing` is a status enum value, not a field.

**Risks**
- Idempotency recorded **after** processing, without a transaction — a crash can reprocess (acknowledged in code).
- The ordering guard compares Stripe `event.created` against DynamoDB `updatedAt` (different clock domains) — a
  legitimate event can be dropped as stale and a sync lost.
- Any workspace member (not just OWNER/ADMIN) sees `stripeCustomerId`/`stripeSubscriptionId`/card last4 via
  `subscription.get.ts`. Money-moving code nearly untested. Legacy docs claim billing "~100%".

## Landing / marketing site

**Implementation 2/5 · Quality 1/5 (verifier downgraded from 2) · Priority High · Effort L**

**Implemented**
- Skeleton only: `apps/landing/app/app.vue` renders the default `NuxtWelcome`; there is no `app/pages/`.
  Layer composition is correct and deliberate (`apps/landing/nuxt.config.ts`: uix + amplify, no auth/billing).
- Wiring exists **on paper**: root scripts, a CI `generate` step (`.github/workflows/ci.yml`),
  `apps/landing/amplify.yml`, permissive robots.txt; the backend grants public-API-key read on `SubscriptionPlan`
  intended for a public pricing page; reusable pricing components exist in `layers/billing`. Honest README.

**Missing**
- All marketing content: home, pricing page consuming the public `SubscriptionPlan` read, SEO
  (zero `useSeoMeta`/sitemap/OG), blog/content, **legal pages (none exist in the whole repo)**, contact/waitlist,
  marketing layouts/nav, analytics/consent, a PRD. SSG-vs-SSR deployment incoherence unresolved.

**Verifier corrections** (drove the quality downgrade)
- The "working infrastructure" is broken in three independent, reproduced ways: `pnpm --filter …landing generate`
  fails (`layers/amplify/tsconfig.json` references a never-generated `.nuxt/tsconfig.app.json`; then the static
  import of gitignored `amplify_outputs.json` in `layers/amplify/plugins/01.amplify.client.ts` fails).
- The CI step can never pass (the workflow does not produce `amplify_outputs.json`) and GitHub shows **zero** workflow
  runs ever.
- `apps/landing/README.md` points to the wrong outputs path (apps/backend vs layers/amplify) — following it does not
  fix the build; the `amplify.yml` preBuild has the same defect, so the hosted deploy would also fail.
- The pricing components are dead code repo-wide (no consumer anywhere, dashboard included).
- The public API key **does** have explicit 365-day expiry; the legacy remediation plan even proposed removing it,
  contradicting the "pricing groundwork" narrative.

**Risks**
- Deploying as-is either pays SSR compute unnecessarily or ships `NuxtWelcome` as the marketing site.
- The marketing site is coupled to the backend deploy cycle (needs `amplify_outputs.json` even for a static build).
- No legal pages is a compliance risk (GDPR/ToS) for anyone shipping the starter.

## UI kit / design system / theming

**Implementation 3/5 · Quality 3/5 · Priority Medium · Effort L** — verifier confirmed both ratings.

**Implemented**
- Thin layer over @nuxt/ui v4 + Tailwind v4: `layers/uix/nuxt.config.ts` registers the module;
  `layers/uix/assets/css/main.css` defines theme tokens (Public Sans, custom green palette, dark-bg override).
  No components/composables of its own.
- `layers/saas` provides the publishable shell: `dashboard`/`auth`/`onboarding` layouts, `AppHeader`/`AppSidebar`/
  `UserMenu`, a typed `saas.*` app-config system (`layers/saas/app.config.ts`), composable navigation config
  (`layers/saas/config/navigation.ts`).
- `apps/saas` uses a second, more polished template shell (`apps/saas/app/layouts/default.vue`: UDashboardGroup,
  collapsible/resizable sidebar, command palette, runtime color/appearance pickers in
  `apps/saas/app/components/UserMenu.vue`). Dark mode works end-to-end; responsive basics correct.

**Missing**
- Nearly none of the uix PRD is implemented: no AppLayout/PageHeader/EmptyState/Loading/ErrorState components, no
  `useTheme()`/`useBreakpoints()`, no tokens/cn utils, no theme app.config the README documents.
- Zero tests (theme/responsive/a11y). Dual-shell duplication with two divergent UserMenus — the layer's dashboard
  chrome is effectively dead (app shadows `layers/saas/pages/index.vue`). Dead config: `saas.theme.colors`
  (primary "blue") maps to nothing. `/logo.svg` referenced but absent repo-wide → broken image in the auth and
  onboarding layouts. Minimal a11y beyond Reka UI. Zero i18n usage. Template residue (Nuxt UI Pro links,
  ui-avatars.com). `layers/uix/README.md` documents a nonexistent API (Nuxt UI Pro, app.config, UDashboardCard).

**Verifier corrections**
- Light/dark **does** persist (`colorMode.preference`); only the runtime primary/neutral color choice does not.
- The effective primary is Nuxt-green `#00DC82` (uix redefines the green palette), not the blue that both app configs
  and the README claim — the dead config is doubly misleading.
- The polished app pages (home charts, customers, inbox, notifications) are **template demos fed by mock endpoints**
  (`apps/saas/server/api/{customers,mails,notifications}.ts`) with a second external avatar service (i.pravatar.cc).
- Positives missed: global keyboard shortcuts (`apps/saas/app/composables/useDashboard.ts`) + command palette
  partially cover the PRD keyboard-a11y flow.
- Template residue is also in the publishable layer itself: `footerNavigation` links to Nuxt UI Pro repos, and the
  command palette generates "View page source" links to the template repo.
- The non-dashboard parts of the layer (auth/onboarding layouts, settings/profile pages) **are** genuinely used.

**Risks**
- Any nav/branding change must be made twice (two shells); layer shell risks bit-rot despite being published.
- README documents an API that does not exist. External avatar dependency (privacy + availability). No automated
  detection of theme/responsive regressions.

## Internationalization

**Implementation 2/5 · Quality 3/5 · Priority Medium · Effort L** — verifier confirmed both ratings.

**Implemented**
- `layers/i18n` registers @nuxtjs/i18n v10.4.0 with correct config (`layers/i18n/nuxt.config.ts`): en default,
  `prefix_except_default`, lazy loading, en/es number and date formats.
- Translation files with programmatically verified en/es key parity: `layers/i18n/i18n/locales/{en,es}/common.json`
  (22 keys), `layers/billing/i18n/locales/{en,es}/billing.json` (34), `apps/saas/i18n/locales/{en,es}/app.json` (17).
- The distributed per-layer locale extension pattern works (billing and the app extend the base layer).

**Missing**
- **Nothing consumes the infrastructure**: zero uses of `$t()`, `useI18n()`, `$n()`, `$d()`, `setLocale`,
  `localePath`, `switchLocalePath` across all layers and apps — every UI string is hardcoded English.
- No language switcher anywhere. Date/currency formatting hardcoded to en-US
  (`layers/billing/components/InvoicesList.vue:212`, `CurrentSubscription.vue`, the home demo components).
- The `useLocalization()` composable documented in the layer README does not exist. Only 3 of 9 layers/apps have
  locale files; the landing does not extend the layer at all. No SEO i18n (no `baseUrl`/`useLocaleHead` → no
  hreflang for `/es` routes). Zero tests.

**Verifier corrections**
- The PRD is honest (all Definition-of-Done checkboxes unchecked). The misleading documents are
  `layers/i18n/README.md` (presents `useLocalization` as part of the layer; still says "Nuxt 3") and the legacy gap
  analysis ("~100% Complete / A+" — it graded configuration, not consumption).
- Minor: HomeStats uses `toLocaleString('en-US')`, not `Intl.NumberFormat` (same effect).
  `layers/billing/composables/formatPrice.ts` uses the browser locale and has a unit test, but ignores i18n locale.
- Locale-unaware routing confirmed: the auth middleware redirects to hardcoded `/auth/login` (loses the `/es`
  prefix); the `'/auth/**': { ssr: false }` route rule does not cover `/es/auth/**`; Stripe return URLs carry no locale.

**Risks**
- `/es/*` routes are generated but serve duplicate English content without hreflang (SEO).
- Latent routing bugs will surface the moment i18n is actually enabled; with zero tests, silently.

## Transactional email

**Implementation 1/5 · Quality 1/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- Effectively nothing: only default Cognito emails (signup verification code, password reset), unbranded, no SES
  sender, no CustomMessage trigger (`apps/backend/amplify/auth/resource.ts`); code resend via
  `Auth.resendSignUpCode` in the Authenticator.
- The invitation backend is email-*ready* (UUID token, 7-day expiry, constant-time validation in
  `apps/backend/amplify/functions/workspace-membership/handler.ts` and the accept/decline endpoints) — but **no email
  is ever sent**. The inbox page is template demo data (`apps/saas/server/api/mails.ts`).

**Missing**
- Everything: provider integration (no SES/Resend/SendGrid/nodemailer SDK anywhere in the repo), the actual
  invitation email (the Lambda returns "Invitation sent successfully" without sending; the invitee has no way to get
  the token; no acceptance page), Cognito email branding, branded templates (no vue-email/mjml), template preview,
  email preferences/unsubscribe, async sending with retries (the workspaces PRD promises "Queue for retry").

**Verifier corrections**
- A preferences UI exists but is a dead template stub (`layers/saas/pages/profile/notifications.vue`, local state +
  TODO) — one more deceptive surface, marked ✅ in the legacy gap analysis.
- Technically completable without email: the token is exposed to OWNER/ADMIN via the invitations GET, and an existing
  user could accept via a manual API call — but there is no UI path, so the product-level conclusion stands.
- `declineInvitation` supports OWNER/ADMIN revocation without a token, but no UI consumes it.

**Risks**
- The invitation flow **lies to the user** (success toast, nothing sent) — the flagship collaboration feature is
  unusable for new users.
- Unmodified Cognito sends from `no-reply@verificationemail.com` with a ~50 emails/day sandbox cap — insufficient for
  any real deployment, with zero branding. Demo `mails.ts` endpoint served by the production app.

## In-app notifications

**Implementation 2/5 · Quality 2/5 · Priority Medium · Effort L** — verifier confirmed both ratings.

**Implemented**
- The only functional piece: consistent `useToast()` feedback across auth, workspaces and billing layers.
- A notification-center **look-alike**: `apps/saas/app/components/NotificationsSlideover.vue` + bell + shortcut `n`,
  fed by `apps/saas/server/api/notifications.ts` — an **unauthenticated mock** returning 27 hardcoded notifications
  (Nuxt UI template demo, i.pravatar.cc avatars). Preferences page is local state with a literal TODO.

**Missing**
- The real system (repo acknowledges it: PRD/plan archived, legacy gap analysis ~0%): a notifications layer with
  `useNotifications()`, a `Notification` model in the schema, an authenticated API with mark-as-read and a real
  unread badge (the bell's badge is always visible — no `:show` binding), the email channel, preference persistence
  (needs a privileged write path: `UserProfile` is owner-read-only), realtime or polling delivery, i18n, tests.

**Verifier corrections**
- Mock endpoint confirmed unauthenticated (the only server auth middleware covers `/api/workspaces` only).
- "Invitation sent successfully" is hardcoded in the Lambda response itself; the accept/decline endpoints have **no
  UI consumer** — the flow is even more incomplete than assessed.
- The slideover's `/inbox?id=…` links land on another template mock page, not broken links but not functionality.

**Risks**
- Fake data in production confuses users and adds an external image dependency (privacy/CSP).
- The preferences page silently discards changes — a user believes they opted out (consent/compliance risk).
- The demo center is app-coupled template code, contradicting the layer architecture; building the real feature
  means discarding it.

## Onboarding

**Implementation 2/5 · Quality 2/5 · Priority Medium · Effort L** — verifier confirmed both ratings.

**Implemented**
- No `layers/onboarding`, no `/onboarding` route. What exists: an orphaned layout
  (`layers/saas/layouts/onboarding.vue`, progress bar via query params — zero pages use it), a
  `saas.features.onboarding: true` flag nothing reads (`layers/saas/app.config.ts`), a static-links welcome home in
  the layer, and **real, functional post-signup provisioning** (profile, personal workspace, groups, Stripe
  customer + free subscription — idempotent) in `apps/backend/amplify/auth/post-confirmation/handler.ts`.
- Complete but archived spec: `doc/archive/prd/onboarding.md` (honest "not yet implemented" banner).

**Missing**
- The entire engine: wizard + config-driven flows (`OnboardingWizard`, `flows.ts`), `useOnboarding()` with
  persistence, progress fields on `UserProfile` (currently only `userId` + `stripeCustomerId`, owner-read-only — a
  write path must be added), redirect middleware, first-steps checklist with real completion state, product tours
  (no library installed), guided empty states, tests; wire or remove the feature flag.

**Verifier corrections**
- The layer's welcome home is shadowed by the app's template demo home (`apps/saas/app/pages/index.vue`, mock-fed
  charts) — the one onboarding touch is not even visible in the reference app.
- post-confirmation swallows all errors ("don't block registration") — the frictionless first-run can fail silently,
  leaving a user without profile/workspace/billing.
- Active legacy docs falsely claim the flow exists (`doc/prd/saas-layer.md` "✅ Onboarding flow";
  `doc/prd/workspaces.md` describes an `/onboarding` redirect; `layers/saas/README.md` documents the layout).

**Risks**
- Dead code/config sets false expectations for adopters. Implementing persistence touches the data-layer security
  surface (opening a `UserProfile` write path).

## Admin panel

**Implementation 1/5 · Quality 3/5 (rates the debug layer only) · Priority Medium · Effort XL** — verifier confirmed.

**Implemented**
- **No operator panel exists.** The only tangential code is the developer debug layer (`layers/debug`), composed into
  `apps/saas`: three pages gated dev-only via `if (!import.meta.dev) throw createError(404)` —
  `/debug` (session/billing inspection, Stripe test actions), `/debug/plans`, `/debug/profile`.
- Every "admin" in the codebase is a workspace-tenant role (OWNER/ADMIN/MEMBER groups, entitlements roles), i.e.
  customer self-service, not platform staff.

**Missing**
- Everything: platform-operator Cognito group (none defined in `apps/backend/amplify/auth/resource.ts`), admin
  app/section with operator authz, user search/management (no `ListUsers`/`AdminGetUser`/`AdminDisableUser` usage),
  cross-tenant workspace management (the data model is per-tenant read-only), impersonation (zero references),
  operator-level Stripe view, platform metrics (signups/MRR), support actions, admin audit log, a PRD.

**Verifier corrections**
- Role attribution fixed: entitlements defines `user`/`admin`/`owner`; OWNER/ADMIN/MEMBER is the workspaces
  `WorkspaceRole` type — both tenant-level either way.
- The template demo pages (`apps/saas/app/pages/customers.vue` fed by mocks; random home metrics) superficially look
  like an operator panel but are dead template code — flagged so they are not mistaken for functionality.
- `layers/debug/README.md` drift is real but mild (mostly example snippets; a few nonexistent utilities documented).

**Risks**
- The debug layer is composed into the app **unconditionally (production included)**; safety rests solely on each
  page's `import.meta.dev` guard — a future page that forgets it would expose session/billing state. Prefer
  excluding the layer by environment.
- Building the real panel is groundwork-heavy: no operator concept in Cognito, client-read-only data model,
  impersonation requires careful token/audit design to avoid a cross-tenant hole.

## Internal API layer

**Implementation 3/5 · Quality 4/5 · Priority Medium · Effort L** — verifier confirmed both ratings.

**Implemented**
- Documented pattern (`doc/adr/patterns/api-server.pattern.md`, `error-handling.pattern.md`); 22 real Nitro routes
  across 4 layers (2 auth + 5 billing + 4 entitlements + 11 workspaces) plus 3 demo endpoints in the app.
- Solid shared server utilities: `withAmplifyAuth`/`withAmplifyPublic` (per-request Amplify SSR context from cookies,
  `layers/amplify/server/utils/amplify.ts`); `requireAuth`/`withAuth`; entitlements guards verifying real membership;
  `invokeWorkspaceMembership` (`layers/amplify/server/utils/workspaceMembership.ts`) channels **all** tenant writes
  through the Lambda with caller-token re-verification (anti confused-deputy).
- Prefix auth middleware (`layers/workspaces/server/middleware/auth.ts`); zod on 6 routes; strong security decisions
  (server-side priceId, explicit-workspaceId permission checks, defense-in-depth with group claims).

**Missing**
- Rate limiting: nonexistent across the Nitro layer. Public customer API keys: nonexistent (the repo's "apiKey" is
  AppSync's public read mode). Validation inhomogeneous: the 4 workspaces mutations call raw `schema.parse()` — a
  ZodError is not an H3Error, so invalid input returns **500** instead of the documented 400 `VALIDATION_ERROR`.
- Inconsistent response formats across layers (`{success,data}` vs raw objects vs flat objects); `data.code` almost
  never included; no shared error helper; no API route tests; no OpenAPI/versioning; unauthenticated demo endpoints.

**Verifier corrections**
- The pattern doc's own "Complete Example" uses a nonexistent signature (the `withAmplifyAuth` callback has no
  `.user`) — it would not work as written. The legacy gap-analysis "code evidence" for checkout is fabricated/stale.
- `withFeature`/`withPermission` wrappers are dead code (defined, never used).
- Entitlements routes using `getValidatedQuery` **do** return 400 correctly; the 500 problem is confined to the 4
  workspaces mutations. `invoices.get.ts` leaves `limit` unbounded (>100 → Stripe error → 500) while the workspaces
  list caps at 100 — confirming the inconsistency.
- 4 e2e specs exist; only `plans.spec.js` hits an API route directly (and verifies the `{success,data}` contract).

**Risks**
- Authenticated users can hammer checkout/portal (Stripe calls) or Lambda invocations without throttling (cost/abuse).
- ZodError→500 breaks the documented client contract. The `/api/workspaces` prefix middleware couples routes to
  their path — a route moved out of the prefix fails non-obviously. `getWorkspaceContext` masks infrastructure
  failures as "no plan".

## File storage

**Implementation 2/5 · Quality 1/5 (verifier downgraded from 2) · Priority Medium · Effort L**

**Implemented**
- Plumbing without a backend: the client plugin exposes `$Amplify.Storage = { uploadData, getUrl }` (a re-export of
  `aws-amplify/storage`, `layers/amplify/plugins/01.amplify.client.ts`); global typing declares it
  (`layers/amplify/types/amplify.d.ts`); `@aws-amplify/storage` declared (as a peerDependency);
  `layers/amplify/README.md` and the legacy amplify PRD document usage. **No S3 bucket exists.**

**Missing**
- Everything functional: no `amplify/storage/resource.ts` (backend defines only auth + data + 3 functions —
  `apps/backend/amplify/backend.ts`), so any `uploadData`/`getUrl` call fails at runtime; the **server** plugin does
  not provide Storage despite README/types claiming it (undefined in SSR); no avatar-upload or attachment UI
  (zero file inputs repo-wide); no upload composable, file API routes, size/MIME validation or per-entity access
  rules; no image optimization; zero tests. There is not even a model field to persist an avatar reference
  (`UserProfile` = `userId` + `stripeCustomerId`, owner-read-only).

**Verifier corrections** (drove the quality downgrade)
- The area's artifacts are mostly **wrong, not merely incomplete**: the README documents a runtime-breaking API as
  functional and falsely claims server-side Storage; the type declarations promise `$Amplify.Storage` in both
  contexts; the legacy gap analysis claims "S3 integration — configuration exists" when no S3 configuration exists
  at all. The only real code is a trivial two-function re-export.
- Both UserMenus leak names to ui-avatars.com — including the app-level one that actually renders.

**Risks**
- Adopters following the documented examples hit runtime errors (missing bucket/config).
- External avatar service dependency (privacy: user/workspace names in URLs to a third party; availability).

## Product analytics

**Implementation 1/5 · Quality 0 (nothing to assess) · Priority Medium · Effort M** — verifier confirmed.

**Current status: not implemented.**
- No provider integration whatsoever (PostHog/Amplitude/Mixpanel/Plausible/gtag/Segment/Matomo/Umami: zero
  dependencies, modules, plugins, composables). Verifier also ruled out the AWS-native path (no Pinpoint/Kinesis).
- Tangential only: entitlements sells `advanced-analytics`/`view-analytics` flags with **no feature behind them**
  (`layers/entitlements/config/features.ts`, `config/permissions.ts` — zero real consumers);
  the template dashboard fakes metrics with `Math.random()` (`apps/saas/app/components/home/HomeStats.vue`,
  `HomeChart.client.vue`, `HomeSales.vue`); a cookie-consent toast in `apps/saas/app/layouts/default.vue` gates no
  script and its "Opt out" button has **no handler**.
- Key events are not tracked anywhere: post-confirmation emits no signup event; the Stripe webhook emits no
  subscription lifecycle events.

**Missing (everything)**: provider integration (SSR-safe client plugin + runtimeConfig), `useAnalytics()`/
`identify()` tied to the Cognito user, key events from the reliable server points (post-confirmation,
stripe-webhook), pageviews, consent-conditioned loading wired to a real consent mechanism, landing tracking, PRD.

**Risks**
- The seeded Stripe plans **sell "Advanced analytics"** (`apps/backend/amplify/seed/data/stripe.json`) with nothing
  behind it — an empty commercial promise. The random-data dashboard misleads about what the starter includes.
  Adding analytics without wiring real consent creates GDPR/ePrivacy exposure from day one.

## Feature flags / experiments

**Implementation 2/5 · Quality 2/5 (verifier downgraded from 3) · Priority Low · Effort L**

**Implemented**
- No runtime flag system, no targeting, no A/B testing. What exists is the entitlements **plan-gating skeleton**
  (static `FEATURES` catalog with a dead `enabled` field, plan matrix, `FeatureGate`/`UpgradePrompt`, `feature`
  middleware, `requireFeature`/`withFeature`, check endpoints) — it evaluates solely against the subscription plan.

**Missing**
- Runtime flags independent of plan (no `FeatureFlag` model; no provider — LaunchDarkly/Unleash/PostHog/GrowthBook/
  Flagsmith/Statsig all absent), user/workspace targeting, percentage rollouts, experiments/variants, an admin
  toggle UI, a working kill switch (`enabled` is never consulted anywhere), tests.

**Verifier corrections** (drove the quality downgrade)
- Grave omission: the entire feature-gating path has **zero consumers outside the layer** (grep-verified) — a
  never-exercised skeleton, not infrastructure in use.
- Both gating navigation exits are broken 404s: `middleware/feature.ts` → `/upgrade` (no page);
  `UpgradePrompt.vue` → `/billing` (real page: `/settings/billing`).
- The layer README is actually honest ("planned future enhancement"); the drift is in the legacy PRD, which lists a
  flag system as in-scope with no roadmap marker.
- "Endpoints with zod" overstated: only `check-feature.get.ts` uses zod, trivially (unvalidated cast to the enum).

**Risks**
- `enabled: false` would not disable anything — misleading catalog semantics.
- Adding app-config flags without server enforcement would create a client bypass; reuse the existing
  `getWorkspaceContext` server pattern instead.

## Observability

**Implementation 2/5 · Quality 2/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- `createLogger(scope)` utility exists (`layers/amplify/utils/logger.ts`) but has **zero consumers** — grep finds only
  its definition and the docs that claim it is used.
- Ad hoc `console.*` in ~29 files; Lambda logs are reasonably contextualized (eventId, workspaceId) and reach
  CloudWatch by Lambda default. Documented error pattern (`doc/adr/patterns/error-handling.pattern.md`), partially
  followed. The Stripe webhook fails loudly (5xx → Stripe retries) with idempotency. Dev-only debug layer.

**Missing**
- Error tracking client & server: zero Sentry/Datadog/Bugsnag anywhere. No `error.vue`, `NuxtErrorBoundary` or
  global `vue:error`/`app:error` hooks in either app. No health endpoint. No request IDs / X-Ray / OpenTelemetry.
  Unstructured logging (no pino/winston). No request-logging middleware. Backend CDK has no CloudWatch alarms,
  dashboards or `logRetention`. Zero tests. Explicitly deferred in legacy plans.

**Verifier corrections**
- Documentation drift is worse than assessed: both `layers/amplify/README.md` **and** `AGENTS.md` claim
  `createLogger` is "used across server routes and Lambdas instead of ad hoc console.*" — false in both places.
- "Routes generally follow the pattern" is only partially true: `createError` with correct HTTP codes yes (25 files),
  but the `data.code` taxonomy is adopted in only **3 files** (VALIDATION_ERROR only) — programmatic client error
  handling is impossible on most of the API.
- Confirmed: `layers/billing/server/api/billing/subscription.get.ts` dumps full Stripe error objects to
  `console.error` without redaction; client composables log errors to the browser console.

**Risks**
- Production failures are silent: a broken webhook would degrade entitlements with nobody noticing (visible only by
  digging in CloudWatch or the Stripe dashboard). Unlimited default log retention (cost/compliance). Sensitive data
  (emails, customer IDs) can reach logs unredacted.

## Testing

**Implementation 2/5 · Quality 3/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- Unit: root `vitest.config.ts`; **3 files / 7 tests**, all passing without live infra
  (`layers/workspaces/composables/__tests__/useWorkspaces.test.ts`,
  `layers/billing/composables/__tests__/formatPrice.test.ts`,
  `layers/entitlements/server/utils/__tests__/requirePermission.test.ts`).
- E2E: substantial Playwright suite (`apps/saas/tests/e2e/`) with mature helper architecture —
  `helpers/auth.js` (466 lines, **real** email verification via Gmail IMAP), `helpers/stripe.js` (1,419 lines, Stripe
  portal automation), `helpers/assertions.js` (966 lines), centralized selectors, fixtures; 4 specs including an
  8-step new-user journey (signup → email verify → free plan → payment method → Pro upgrade → sync).

**Missing**
- Unit coverage nearly nonexistent: 2 of 9 composables, **0 of 22 API routes, 0 of 3 Lambdas**; no component tests
  (@nuxt/test-utils absent); no coverage tooling or CI threshold.
- No workspaces / entitlements / password-reset e2e. The whole e2e suite requires live infra (Amplify sandbox +
  Cognito + Stripe + Gmail IMAP) — no CI-executable variant exists. `apps/saas/tests/e2e/README.md` references specs
  that do not exist.

**Verifier corrections**
- The Playwright `individual` project is **broken**: its `testMatch` does not match the nested spec paths —
  `--project=individual --list` yields 0 tests; the corresponding package script is dead.
- Running the full suite executes the new-user journey **twice** (chromium + flows projects): 26 executions for 18
  unique tests; combined with `workers:1` + `maxFailures:1` + `retries:0`, this aggravates fragility.
- Confirmed: 46 fixed `waitForTimeout` calls; cleartext shared test credentials and `@ontopix.ai` emails versioned in
  `apps/saas/tests/e2e/fixtures/users.json`; e2e absent from all CI workflows.

**Risks**
- Unit tests hand-stub Nuxt auto-imports on `globalThis` — may diverge silently from real Nuxt behavior.
- The e2e suite is inherently fragile and not portable for starter adopters (external services, hardcoded domain).
- Regressions in the 22 server routes — including workspace/billing authorization — are only detectable by manual e2e.

## CI/CD & deployment

**Implementation 2/5 · Quality 2/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- `.github/workflows/ci.yml`: install / lint / vitest / typecheck / build saas / generate landing (Node 22, pnpm cache).
- Two layer-publishing workflows (`publish-layers.yml` manual bump; `publish-on-tag.yml` tag-triggered) with scripts.
- Per-app `amplify.yml` deploy configs; the backend uses the official Gen2 `ampx pipeline-deploy` pattern and is real
  IaC (Cognito, AppSync/DynamoDB, Lambdas). Step-by-step production guide in `README.md`; per-developer sandbox flow.

**Missing / broken**
- **CI cannot pass on a clean checkout and has never run** (bug #10): static `amplify_outputs.json` imports, exactly
  341 typecheck errors (reproduced), no outputs stub in CI.
- No preview environments. Hosting apps are console click-ops (only the backend is IaC). Cross-app wiring broken:
  README's `BACKEND_APP_ID` is consumed by nothing — scripts use `$AWS_APP_ID`, which inside the saas/landing builds
  is the *frontend* app's ID. The backend build-skip logic doesn't skip (exit 0 in preBuild; `git diff HEAD~1`).
- Publishing hardening: archived `actions/create-release@v1`, double pnpm setup with divergent versions, publish
  without build/test, tag/version mismatch only warns. No Dependabot/Renovate, CodeQL, concurrency groups, CODEOWNERS.

**Verifier corrections**
- Aggravated: `ci.yml` does not exist on `origin/master` — it lives only on the local remediation branch with no
  remote; GitHub shows **zero workflow runs ever**, including the two publish workflows that are on master.
- Node engines mismatch confirmed: `pnpm lint` crashes on Node 20 (Object.groupBy via eslint-flat-config-utils)
  while `README.md` requires only >= 20.19.
- The Nitro `aws-amplify` preset is implicit autodetection, not configured anywhere.
- `publish-on-tag.yml` never runs `pnpm install` before publishing — zero validation the package even resolves.

**Risks**
- False sense of safety: the CI gate has never operated; PRs merge unverified.
- Production builds of saas/landing can generate outputs against the wrong Amplify app until fixed by hand.
- Production secrets (Stripe) are managed manually in the console — documented but not reproducible or auditable.

## Security & compliance

**Implementation 3/5 · Quality 4/5 · Priority High · Effort L** — verifier confirmed both ratings.

**Implemented**
- **Exceptional multi-tenant isolation**: group-per-workspace, tenant models client-read-only, every write through
  privileged Lambdas (`apps/backend/amplify/data/resource.ts`, extensively documented). The workspace-membership
  Lambda verifies the caller's token via Cognito `GetUser`, re-checks roles per action, compares invitation tokens in
  constant time, and forbids invitation-granted OWNER; invocation restricted to the authenticated IAM role.
- Stripe webhook: signature verification before parsing, idempotency, ordering guard, status whitelist.
- Server authn/authz utilities + prefix middleware + entitlements RBAC (unit-tested `requirePermission`).
- Secrets handled correctly: Amplify `secret()` for Stripe keys, server-only runtimeConfig
  (`layers/billing/nuxt.config.ts`), `appBaseUrl` deliberately not derived from attacker-controllable Host headers,
  no tracked `.env`. Server-side priceId. Session cookies `sameSite: lax` + `secure` (implicit CSRF mitigation).

**Missing**
- Security headers: no CSP/HSTS/X-Frame-Options/nuxt-security in any config. No explicit CSRF tokens or Origin checks
  on cookie-authenticated mutating routes (SameSite only). No rate limiting anywhere (app, WAF, AppSync).
  Audit log exists only as a **sold** entitlement flag. GDPR: no data export; account deletion is a dead button.
  No legal pages in any app. MFA not configured. The tenancy-critical Lambda has **zero tests**.

**Verifier corrections**
- Cookie posture is consistent on both sides (client `CookieStorage` sameSite lax, secure default) — slightly better
  than assessed. Isolation stronger than described: `acceptInvitation` adds fail-closed provenance checks (canonical
  group-set match; inviter must still be OWNER/ADMIN at accept time).
- Password **recovery** works (forgot-password flow); only in-session change and deletion are dead UI.
- Surface the assessor missed: three unauthenticated template demo endpoints (bug #6) — mock data only, but forgotten
  public routes that should be removed or protected.

**Risks**
- SameSite-only CSRF defense: a cookie-config change or legacy browser reopens the vector.
- Deceptive security page (stubs marked complete in legacy docs) — GDPR right-to-erasure gap.
- Webhook Function URL has no WAF/rate limit (abuse/cost). 365-day public API key needs rotation discipline.
  A regression in `workspace-membership/handler.ts` would compromise tenancy with no test to catch it.

## DX, documentation & tooling

**Implementation 4/5 · Quality 3/5 (verifier downgraded from 4) · Priority Medium · Effort M**

**Implemented**
- Reproducible setup: 957-line `README.md` (AWS CLI, sandbox init, Stripe secrets + Function-URL webhook, per-app
  production deploy, Node 22); `AGENTS.md` operational guide; bootstrap guides (`doc/guides/make-it-yours.md`,
  `doc/guides/using-published-layers.md`).
- High-quality seed tooling: `apps/backend/amplify/seed/seed.ts` orchestrator; plans synced **from** Stripe metadata;
  idempotent user seeder with trigger polling and manual fallback.
- Dev-only debug layer with correct guards (and care not to render the Stripe secret in SSR). 10 legacy PRDs + 8 ADR
  patterns, unbuilt features properly archived. Namespaced scripts, `taskfile.yaml`, CI config, layer publishing
  tooling, substantial READMEs in all 9 layers and 3 apps, structured e2e suite.

**Missing / broken**
- Dead seed script and empty `/debug` checkout tooling (bugs #8, #9). The analysis docs `AGENTS.md` declares
  *mandatory reading* are stale (2025-12-02; claim Nuxt UI Pro). `scripts/generate-layer-packages.js` would
  regenerate obsolete peer deps (`@nuxt/ui-pro`, Tailwind 3) if run. `.env.example` exists only in `layers/billing`.
  No scaffolding generator, no CONTRIBUTING/CHANGELOG, `SANDBOX_STACK_NAME` precondition consumed by nothing,
  thin unit coverage, no devcontainer or single bootstrap command.

**Verifier corrections** (drove the quality downgrade)
- **New defect**: the seeder never creates subscriptions with the shipped fixture (bug #7) — ~140 lines of
  subscription-seeding code are unreachable and the skip is silent, undermining the "high-quality seeds" claim.
- `layers/debug/README.md` also documents the obsolete `UserSubscription` model.
- Everything else confirmed with exact references; minor positives noted (publish-all script, 15 granular e2e scripts).

**Risks**
- Agents/developers following the mandated stale analysis docs act on false information.
- Running the package generator would silently revert remediation work.
- Versioned shared test credentials (`TestPassword123!`, `ontopix.ai` emails) are dangerous if reused outside sandboxes.

## AI / LLM integration

**Implementation 1/5 · Quality 0 (nothing to assess) · Priority Medium · Effort L** — verifier confirmed.

**Current status: not implemented.**
- Zero AI SDKs or providers in any `package.json` (openai/anthropic/@ai-sdk/langchain/bedrock).
- The Amplify schema uses no AI Kit primitives (`a.generation()`/`a.conversation()` absent from
  `apps/backend/amplify/data/resource.ts`); no Bedrock/IAM provisioning in `apps/backend/amplify/backend.ts`.
- No chat UI (the only "chat" artifact is an auto-generated @nuxt/ui v4 theme file and a residual template link).
  No prompt management, token metering, or usage-based billing (the Stripe integration is subscription/portal-first).
  No PRD or plan — the area was absent from the legacy roadmap entirely.

**Verifier corrections**: transitive Bedrock SDK entries exist in `pnpm-lock.yaml` via the AWS toolchain (unused);
the entitlements catalog has 10 features, none AI; a third Lambda (post-confirmation) exists — all irrelevant to the
conclusion. Ratings 1/0 confirmed.

**Risks (competitive / build-time)**
- An AI module is table stakes in 2026 commercial starters (Makerkit, Supastarter ship one).
- When building: usage metering is the expensive part — it must respect the client-read-only write model (all writes
  via Lambdas) and add metered billing to a portal-first Stripe setup; Amplify AI Kit depends on Bedrock regional
  availability and IAM permissions not currently provisioned.

## Background jobs

**Implementation 1/5 · Quality 0 (nothing to assess) · Priority Medium · Effort M** — verifier confirmed.

**Current status: not implemented.**
- No scheduled Amplify functions, EventBridge, SQS, DLQ, Nitro `defineTask`, or job libraries (grep-verified).
  All three Lambdas (stripe-webhook, workspace-membership, post-confirmation) are reactive, not jobs.
- Two deliberate lazy substitutes exist: invitation expiry is checked at accept time
  (`apps/backend/amplify/functions/workspace-membership/handler.ts`), and the webhook's idempotency + ordering guard
  (`ProcessedStripeEvent`) would make a future reconciliation job safe to add.

**Missing**: example scheduled functions — the repo's own docs name the candidates (expired-invitation cleanup,
`ProcessedStripeEvent` purge/TTL, periodic Stripe reconciliation); queue infrastructure (the archived notifications
PRD required queues/EventBridge); DLQ/retry configuration on the Lambdas; documented job patterns; tests.

**Verifier corrections**: no DynamoDB TTL on any table confirmed; doc citations exact; third Lambda noted.

**Risks**
- `ProcessedStripeEvent` rows and never-accepted invitations accumulate **unboundedly** in DynamoDB.
- A webhook lost beyond Stripe's ~3-day retry window leaves subscription state permanently desynced — no self-healing.
- Without DLQ/alarms, failures in any future async work would be silent.

## Customer support & feedback

**Implementation 1/5 · Quality 1/5 · Priority Medium · Effort L** — verifier confirmed both ratings.

**Current status: effectively not implemented.**
- The only artifacts are template placeholders: footer "Feedback" / "Help & Support" links pointing at **Nuxt UI Pro
  GitHub repos** (`layers/saas/config/navigation.ts`), plus more template links in the user menu
  (`apps/saas/app/app.config.ts`: "Upgrade to Pro", "Templates").
- No chat widget (no crisp/intercom/zendesk code; `useScriptCrisp` entries are Nuxt built-in stubs — @nuxt/scripts is
  not installed). No feedback widget, no support API route or Lambda, no outbound email capability, no landing
  contact page (the landing has no pages). The inbox is 100% template mock.

**Missing**: chat widget with logged-in user/plan identification, feedback/report-a-bug capture with automatic
context → a server endpoint, backend routing (email or helpdesk), landing contact form, configurable link
destinations, PRD + tests.

**Verifier corrections**
- Aggravating: entitlements **sells `priority-support`** in the Pro plan (`layers/entitlements/config/features.ts`)
  with no support channel behind it.
- `mailparser`/`node-imap` exist only as e2e devDependencies — not support capability.
- The cookie-consent "Opt out" does not persist, so decliners see the toast every session — fix before adding any
  third-party widget.

**Risks**
- Derived products would send their customers to third-party repos. The mock inbox is mistakable for functionality.
- Passing user email/plan to a chat vendor without real consent gating has GDPR implications. Any contact form first
  requires the cross-cutting email-provider decision (also blocking invitations and notifications).

## Realtime / live updates

**Implementation 1/5 · Quality 0 (nothing to assess) · Priority Medium · Effort L** — verifier confirmed.

**Current status: not implemented.**
- Zero uses of `observeQuery`, `.subscribe()`, `onCreate/onUpdate/onDelete` or any `useRealtime` in apps/layers;
  no WebSocket/EventSource/BroadcastChannel/polling alternatives either (verifier-checked). All data flows are
  request/response `$fetch` to Nitro routes.
- The groundwork is one step away: the client plugin exposes a `generateClient<Schema>` (userPool auth) that nothing
  consumes for data (`layers/amplify/plugins/01.amplify.client.ts`); the AppSync schema auto-generates subscriptions
  and tenant models are client-readable by groups; the privileged Lambdas write via AppSync mutations, so
  subscription events **would** fire.

**Missing**: a `useRealtime`/`useObserveModel` pattern (client-only, teardown, resubscribe after token refresh);
live notifications (no model/producers); live members/invitations; **post-checkout subscription sync** — the billing
page ignores the returned `session_id` and races the webhook (`layers/saas/pages/settings/billing.vue`); pattern
docs (the legacy amplify PRD promises "Real-time subscription support"; its utils file was deleted); tests.

**Verifier corrections**
- Resolves the open question: Amplify Gen2 **does** support realtime subscriptions with `groupsDefinedIn`, but caps
  at ≤20 groups per user/record — with 2 groups per workspace, a user in more than ~10 workspaces can no longer
  authorize subscriptions. A scale ceiling to document.
- `WorkspaceSubscription` has only the group rule (no `ownerDefinedIn`), so post-checkout live sync depends entirely
  on dynamic group auth plus the token-refresh caveat already documented in the schema.
- Stale comment in the client plugin claims an API_KEY default; the schema default is `userPool`.

**Risks**
- Subscriptions open a second authorization surface (browser→AppSync direct) parallel to the Nitro cookie path.
- Group claims appear only after token refresh (already mitigated ad hoc in `createWorkspace`).
- WebSocket lifecycle/SSR safety and per-tab connection quotas need a deliberate pattern.

## Email marketing

**Implementation 1/5 · Quality 0 (nothing to assess) · Priority Medium · Effort L** — verifier confirmed.

**Current status: not implemented.**
- No provider integration (mailchimp/convertkit/loops/resend/brevo/klaviyo: zero hits including the lockfile).
- The landing is a shell with no newsletter form; the preferences page is a non-persisting stub; the customers page
  showing subscribed/unsubscribed states is template mock data (`apps/saas/server/api/customers.ts`);
  the natural sync points (post-confirmation, stripe-webhook Lambdas) perform no audience sync.

**Missing**: provider abstraction behind env config; newsletter capture with double opt-in (requires the landing to
exist first); contact sync on signup and tag updates on subscription lifecycle (upgrade/downgrade/churn from the
webhook); **real consent/unsubscribe persistence** (`UserProfile` has no email-preference fields); lifecycle hooks
(welcome, trial-ending, winback); PRD + tests.

**Verifier corrections**
- The archived notifications PRD **did** specify the consent half of this area (marketing vs transactional
  categories, marketing toggle) — 0% built, reinforcing the gap.
- No transactional email exists to build on (invitations never send email) — the area lacks even its substrate.
- The inbox/mails mock is another deceptive demo surface of the same family.

**Risks**
- Deceptive UI: an adopter could send marketing while ignoring toggles that never persist — GDPR/CAN-SPAM exposure
  (no consent record, no real unsubscribe).
- post-confirmation swallows errors, so audience sync added there would fail silently (no retries/DLQ).
- With no event bus, lifecycle hooks would couple directly to the auth/billing Lambdas.
