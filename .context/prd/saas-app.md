# PRD — SaaS Application

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/saas.md, doc/prd/configuration.md

The umbrella product requirements for the starter: the deployable SaaS dashboard (`apps/saas`) plus the cross-cutting architecture and instance-configuration contract it is built on. Per-domain requirements (auth, billing, workspaces, …) live in sibling PRDs; this document defines what the composed product must do.

## Purpose & scope

A production-ready SaaS starter kit built with Nuxt 4 and AWS Amplify Gen2: authentication, workspace multi-tenancy, Stripe billing and a professional dashboard UI, assembled from reusable Nuxt layers.

| | |
|---|---|
| **Includes** | Cognito authentication; workspace-scoped multi-tenancy; Stripe subscription billing + customer portal; entitlements/RBAC by workspace plan; i18n; dashboard UI on @nuxt/ui v4; Amplify Gen2 backend (Cognito, AppSync, DynamoDB, Lambda); layer-based modular architecture; dev/debug tooling; deployment config |
| **Excludes** | Business-domain features (inventory, booking, …) — the starter is the platform, not the product |

**Artifacts** (as they exist in the repo today):

| Artifact | Path | Role |
|---|---|---|
| Backend | `apps/backend/` | Amplify Gen2 IaC (auth, data, functions, seed) |
| SaaS dashboard | `apps/saas/` | Main application, Nuxt 4 SSR |
| Landing | `apps/landing/` | Marketing site, Nuxt 4 SSG (skeleton only — see landing audit) |
| Enabling layers | `layers/amplify/`, `layers/uix/`, `layers/i18n/`, `layers/debug/` | AWS integration, design system, i18n infra, dev-only debug pages |
| Feature layers | `layers/auth/`, `layers/billing/`, `layers/entitlements/`, `layers/workspaces/` | Business capabilities |
| Meta layer | `layers/saas/` | Publishable app shell: layouts, navigation config, base pages |

Earlier versions of this PRD listed `layers/onboarding/` and `layers/notifications/` as existing artifacts. **Neither layer exists** — they are roadmap items (epics E15 and E14 in [roadmap.md](./roadmap.md)).

## Requirements

### Functional (target)

| Requirement | Specification |
|---|---|
| Authentication | Full flow (signup, signin, password reset, sign-out) on AWS Cognito via `layers/auth` (`useUser()` — `layers/auth/composables/useUser.ts`) |
| Workspaces | Multi-tenant workspaces; subscriptions and data scoped to the workspace; group-per-workspace Cognito isolation (`layers/workspaces`) |
| Billing | Stripe checkout + customer portal at workspace level (`layers/billing`, `useBilling()`) |
| Entitlements | Role- and plan-based gating of UI, routes and server APIs (`layers/entitlements`, `useEntitlements()`) |
| Dashboard UI | Responsive dashboard shell (collapsible sidebar, dark mode) on @nuxt/ui v4 |
| i18n | Multi-language UI with locale-aware date/currency formatting (`layers/i18n`) |
| Configurability | Branding, navigation, theming and feature toggles overridable per instance without touching layer code (see "Instance configuration" below) |
| Onboarding | First-run wizard with persisted progress — **not implemented** (see Current status) |
| Notifications | In-app notification center — **not implemented** (mock only; see Current status) |

### Architecture

- **Monorepo**: pnpm workspaces; `apps/` are deployable, `layers/` are reusable Nuxt layers published as `@mmshark/*-layer` packages. Shared tooling at the root.
- **Nuxt layers**: each layer follows the standard structure (`components/`, `composables/`, `middleware/`, `server/`, `types/`, `nuxt.config.ts`) and is auto-imported by consuming apps. Existing cross-layer surface: `useUser()`, `useBilling()`, `useEntitlements()`, `useWorkspaces()`, `useSaasConfig()`, and the injected `$Amplify` plugin (`layers/amplify/plugins/01.amplify.client.ts`) exposing the userPool-authenticated GraphQL client. (Composables named `useGraphQL()`/`useTranslation()` in earlier PRD versions never existed and are dropped.)
- **Backend (Amplify Gen2)**: TypeScript IaC in `apps/backend/amplify/` — `auth/` (Cognito + `post-confirmation` trigger at `apps/backend/amplify/auth/post-confirmation/handler.ts`), `data/resource.ts` (models: `UserProfile`, `SubscriptionPlan`, `Workspace`, `WorkspaceMember`, `WorkspaceInvitation`, `WorkspaceSubscription`, `ProcessedStripeEvent`), `functions/` (`stripe-webhook`, `workspace-membership`), `seed/`. There is **no storage resource** (the S3/avatar requirement belongs to roadmap epic E07) and no `graphql-resolver` function, both of which the old PRD listed.
- **Server API pattern**: Nitro `server/api` routes for multi-step business logic, Zod validation and third-party integrations (Stripe); direct AppSync GraphQL for plain model access; Lambda Function URL for the Stripe webhook. Details in the api-server pattern ([../patterns/api-server.md](../patterns/api-server.md)).
- **Environments & deployment**: secrets and env-specific values via `runtimeConfig` in `nuxt.config.ts` (never in `app.config.ts`); backend deployed per branch via Amplify Gen2; `apps/saas` as SSR Node app; `apps/landing` as SSG.

### Instance configuration

*(merged from doc/prd/configuration.md)*

**Goal**: configure the whole SaaS instance from the consuming app, overriding layer defaults, with full type safety.

| Mechanism | Use for | Properties |
|---|---|---|
| `app.config.ts` | Branding, navigation, theming, feature toggles, public behavior | Reactive, client-visible, merges Layer < App |
| `nuxt.config.ts` `runtimeConfig` | Secrets, env vars, build options | Static, server-hydrated, env-overridable (`NUXT_*`) |

**Contract** — all layer configuration lives under a single `saas` namespace in `app.config.ts`:

1. A layer defines its defaults in its own `app.config.ts` under `saas.<area>` and augments `AppConfigInput` in a `types/*.d.ts` for type safety.
2. The app overrides values in its `app.config.ts` (deep-merged by Nuxt).
3. Code reads config via `useAppConfig().saas.…` or the typed helper `useSaasConfig()` (`layers/saas/composables/useSaasConfig.ts`).

**Implemented shape today** (defaults in `layers/saas/app.config.ts`, types in `layers/saas/types/saas-config.ts`, app overrides in `apps/saas/app/app.config.ts`):

```ts
saas: {
  brand:      { name, logo, description, favicon },
  navigation: { sidebar: { main, footer }, header, userMenu },
  features:   { multiWorkspace, workspaceSwitcher, onboarding, darkMode },
  layouts:    { dashboard: { sidebarCollapsible, … }, auth: { showBranding, … } },
  theme:      { colors: { primary, neutral } }
}
```

**Target scope not yet realized**: per-layer namespaces (`saas.uix`, `saas.auth`, `saas.billing`, `saas.workspaces`) with defaults defined *in each layer*. Today only `layers/saas` participates — no other layer ships an `app.config.ts` (verified: `layers/*/app.config.ts` matches only `layers/saas`). See Current status.

### Testing

No-mocks philosophy: E2E against a real Amplify sandbox (Cognito, Stripe test mode) is the primary safety net, with unit tests reserved for pure logic. The Playwright suite lives at `apps/saas/tests/e2e/` (layer specs + serial flow specs). Coverage today is thin — see the testing section of the audit report and roadmap epic E11.

## Current status

Honest state as of the 2026-07-08 verified audit (digest areas: **uix**, **onboarding**, **admin**). The recurring failure mode of this app is **template residue and infrastructure without consumers**, not missing backend capability.

### App shell & UI (audit `uix`: impl 3/5, quality 3/5)

| Item | Status |
|---|---|
| Design system | ✅ @nuxt/ui v4 + Tailwind v4; `layers/uix` is minimal (module registration in `layers/uix/nuxt.config.ts`, theme tokens in `layers/uix/assets/css/main.css`) — no components/composables of its own |
| App shell | ⚠️ **Duplicated**: hand-made shell in `layers/saas` (`layouts/dashboard.vue`, `AppHeader.vue`, `AppSidebar.vue`, `UserMenu.vue`) coexists with the `UDashboardGroup` shell in `apps/saas/app/layouts/default.vue`; the app shadows the layer (two divergent `UserMenu.vue`) |
| Template demo residue | ❌ `apps/saas` still ships Nuxt UI dashboard-template pages presented as product: Home with fake charts (`apps/saas/app/pages/index.vue`, `Math.random()` data in `apps/saas/app/components/home/HomeChart.client.vue`), `customers.vue`, `inbox.vue`, `NotificationsSlideover.vue` — all fed by **mock, unauthenticated** endpoints `apps/saas/server/api/{customers,mails,notifications}.ts` |
| Theming | ⚠️ Runtime theme picker mutates `appConfig.ui.colors` in memory only (light/dark mode does persist); the configured `saas.theme.colors` key has **no consumers**; effective primary is the CSS-redefined `green` palette, not the configured `blue` |
| Configuration contract | ⚠️ Partially implemented: `saas.navigation` and `saas.brand` are consumed (`apps/saas/app/layouts/default.vue`, `apps/saas/app/components/UserMenu.vue`, `layers/saas` layouts); `saas.theme` and `saas.features` are dead keys; no layer other than `layers/saas` defines defaults or types |
| UI tests | ❌ None (no theme/responsive/a11y specs) |

### Onboarding (audit `onboarding`: impl 2/5, quality 2/5)

- ❌ No `layers/onboarding/`, no `/onboarding` route, no wizard, no `useOnboarding()`.
- ❌ Orphan artifacts that suggest otherwise: layout `layers/saas/layouts/onboarding.vue` (zero pages use it) and the flag `saas.features.onboarding: true` (`layers/saas/app.config.ts`) that no code reads.
- ❌ No progress persistence possible today: `UserProfile` (`apps/backend/amplify/data/resource.ts`) has no onboarding fields and is client-read-only (sole writer is the post-confirmation Lambda).
- ✅ What does work: post-signup auto-provisioning in `apps/backend/amplify/auth/post-confirmation/handler.ts` — UserProfile, personal workspace, per-workspace Cognito groups, Stripe customer.
- ⚠️ The layer's welcome home (`layers/saas/pages/index.vue`) is shadowed by the template demo home in `apps/saas/app/pages/index.vue`.

### Admin panel (audit `admin`: impl 1/5)

- ❌ No operator/admin panel of any kind: no global staff Cognito group (only per-workspace groups), no cross-tenant user/workspace management, no impersonation, no operator view of Stripe subscriptions.
- ✅ Only adjacent capability: dev-gated debug pages `layers/debug/pages/debug/{index,plans,profile}.vue`, each returning 404 outside dev via an `import.meta.dev` guard.
- ⚠️ The demo `customers.vue`/`inbox.vue` pages superficially resemble an operator panel but are mock-data template residue (see above).

## Open issues & risks

From the audit's verified corrections and risk notes:

1. **Unauthenticated mock endpoints in production surface** — `apps/saas/server/api/{customers,mails,notifications}.ts` have no auth (the only server auth middleware covers `/api/workspaces*`) and serve fake data with external avatar URLs (`i.pravatar.cc`), a privacy/CSP liability. Fix: roadmap E02/E03.
2. **UI that fakes functionality** — demo charts, always-on notification badge, notification-preferences page that silently discards changes (`layers/saas/pages/profile/notifications.vue`). Misleads adopters and end users. Fix: E03.
3. **Dual-shell divergence** — every navigation/branding change must be made twice; the `layers/saas` shell is published as a package but barely exercised (bit-rot risk). Fix: E03 (pick one shell).
4. **Debug layer composed into production builds** — `apps/saas/nuxt.config.ts` extends `@mmshark/debug-layer` unconditionally; safety rests on each page's runtime `import.meta.dev` guard. Prefer environment-conditional composition.
5. **Silent provisioning failures** — the post-confirmation handler swallows all errors so signup never fails, which can leave a confirmed user without profile/workspace/Stripe customer, with no retry or compensation.
6. **Dead configuration keys** — `saas.theme` and `saas.features.onboarding` exist in config/types but nothing consumes them; either wire them or remove them (drift magnet).
7. **Documentation drift at the source** — `layers/uix/README.md` documents an `app.config.ts` theming API that does not exist; `layers/saas/README.md` presents the onboarding layout as a working feature. The superseded `doc/prd/saas.md` claimed onboarding/notifications layers and a backend storage resource that were never built. This document replaces those claims.

## Related

- [Roadmap](./roadmap.md) — gaps above map to epics **E02** (fix-broken-wiring), **E03** (template-cleanup), **E06** (entitlements-wiring), **E07** (account-management, incl. the missing storage resource), **E14** ([notifications](./notifications.md)), **E15** ([onboarding](./onboarding.md)), **E18** (admin-panel).
- Audit report backing "Current status": [../audits/reports/saas-starter-features-2026-07-08.md](../audits/reports/saas-starter-features-2026-07-08.md).
- Pattern: [../patterns/api-server.md](../patterns/api-server.md) — server API conventions referenced by the architecture requirements.
- Sibling per-domain PRDs (auth, billing, workspaces, entitlements, i18n, uix) live in this directory as they are migrated from `doc/prd/`.
