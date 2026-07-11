# Product Definition — starter-nuxt-amplify-saas

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/README.md, AGENTS.md

## What it is

A **SaaS starter kit**: a pnpm monorepo that composes Nuxt 4 (TypeScript, SSR) frontend apps
from reusable **Nuxt Layers**, backed by an **AWS Amplify Gen2** backend (Cognito auth,
DynamoDB/AppSync data, privileged Lambdas) and **Stripe** for billing (portal-first).
UI is `@nuxt/ui` v4 (MIT) + Tailwind v4. Node ≥ 22, pnpm via corepack, strict TypeScript.

Deliberate architectural commitments (see the [productization roadmap](../roadmaps/20260711-saas-boilerplate-productization.md)):

- **Amplify-native**: no self-hosting or non-AWS portability goal.
- **REST via Nitro `server/api`** with `withAmplifyAuth`/`withAmplifyPublic` wrappers; tRPC was removed.
- **Tenant isolation via per-workspace Cognito groups**; tenant tables are client-read-only —
  every write goes through a privileged Lambda that re-verifies the caller (see AGENTS.md,
  "Data Authorization & Multi-Tenancy Security Model").
- **Stripe as source of truth for plans**: `SubscriptionPlan` rows are synced *from* Stripe
  products/prices; subscription lifecycle is synced by a webhook Lambda (Function URL, not a Nitro route).

## Who it is for

- **Teams/solo developers bootstrapping a multi-tenant B2B SaaS on AWS** who want auth,
  tenancy, and billing pre-wired instead of assembled from scratch.
- **Adopters of the template**: extend `apps/saas` (dashboard) and `apps/landing` (marketing).
  Completed E26 introduced the canonical validated `saas.config.ts`; planned E27 migrates runtime
  consumers away from duplicated catalogs and E28 automates initialization.
- **Layer consumers**: each layer is a workspace package (`@mmshark/<layer>-layer`) reusable
  in other Nuxt 4 projects.

## Feature pillars and current maturity

Originally verified by the 2026-07-08 feature audit and reconciled after completed E01–E03/E05.
The audit remains historical evidence; the [roadmap](../roadmaps/20260711-saas-boilerplate-productization.md) owns current sequencing.

| Pillar | One-line current maturity |
|---|---|
| Authentication | Cognito email+password (sign-up, verify, sign-in, reset) works end-to-end; MFA, social login, and authenticated password change do not exist. |
| Multi-tenant workspaces | Group-per-workspace isolation and Lambda-mediated writes are solid; the invitation flow is unusable end-to-end (no email delivery, no acceptance page). |
| Billing (Stripe) | Workspace-scoped Checkout/Portal/webhook flow is operational: seeded public plans, owner-only free→paid Checkout, monthly/yearly pricing, metadata-driven trials, webhook synchronization and portal-backed paid-plan management. |
| Entitlements / RBAC | Server-side enforcement and workspace subscription hydration are real; reusable client gates/middlewares exist but product pages still use ad-hoc checks instead of consuming them. |
| i18n | en/es infrastructure is configured but nothing consumes it — all UI strings are hardcoded English, no language switcher. |
| UI kit / theming | `@nuxt/ui` v4 + Tailwind v4 power one layer-owned dashboard shell; mock/template pages and the parallel app shell were removed by E03. Some decorative config keys remain for E27. |
| Landing / marketing | Skeleton only — `apps/landing` renders Nuxt's default welcome page; no marketing content, pricing page, or SEO. |
| DX / docs / tooling | Taskfile contract, green offline CI, reproducible seeds/E2E and an additive typed product manifest; runtime projection and initialization remain E27/E28. |

**Current status (honest summary)**: the backend core, single dashboard shell and free→paid billing
flow are operational. The next constraint is productization: E26 defines a canonical manifest but
runtime configuration remains duplicated until E27; invitations, account management, i18n and client entitlement
gating still need their end-to-end product loops completed. See the Now/Next/Later
[roadmap](../roadmaps/20260711-saas-boilerplate-productization.md).

## Applications (3)

| App | Package | Purpose |
|---|---|---|
| `apps/backend` | `@starter-nuxt-amplify-saas/backend` | Amplify Gen2 backend: Cognito auth + post-confirmation trigger, AppSync/DynamoDB schema, privileged Lambdas (`workspace-membership`, `stripe-webhook`), seeds. |
| `apps/saas` | `@starter-nuxt-amplify-saas/saas` | Nuxt 4 SSR dashboard app — the product; extends the `saas` meta-layer and holds instance config. |
| `apps/landing` | `@starter-nuxt-amplify-saas/landing` | Nuxt 4 marketing site (SSG intent); currently an empty skeleton (default welcome page). |

## Layers (9)

All published as `@mmshark/<layer>-layer` workspace packages under `layers/`.

| Layer | Purpose |
|---|---|
| `amplify` | Client/server integration between Nuxt and Amplify: config, IAM/userPool Data clients, `withAmplifyAuth`/`withAmplifyPublic` helpers, Lambda invocation, logger. |
| `auth` | Authentication: Cognito sign-in/sign-up/email verification, SSR-safe session composables, route middleware, profile read. |
| `billing` | Stripe integration: portal-first subscription management, checkout/portal Nitro routes, pricing components (webhook itself lives in `apps/backend`). |
| `workspaces` | Multi-tenant workspace CRUD, member invitations, and the Cognito-group tenant-isolation model (writes proxied through the `workspace-membership` Lambda). |
| `entitlements` | Authorization/RBAC: plan-based feature gating (`free`/`starter`/`pro`/`enterprise`), permission checks, server-side `getWorkspaceContext`/`requirePermission`. |
| `i18n` | Internationalization: multi-language support and date/currency formats via `@nuxtjs/i18n`. |
| `uix` | UI foundation and theme, built on `@nuxt/ui` v4 + Tailwind v4. |
| `saas` | Meta-layer composing all of the above into the dashboard application shell (layouts, navigation, pages) for `apps/saas` to extend. |
| `debug` | Development-only debugging pages/utilities (404 in production builds). |

## PRD index

Per-domain PRDs in this directory:

| Document | Domain |
|---|---|
| [SaaS boilerplate productization](../roadmaps/20260711-saas-boilerplate-productization.md) | Active outcome roadmap, phases and atomic deliveries. |
| [amplify.md](amplify.md) | Amplify layer — Nuxt/AWS backend integration. |
| [auth.md](auth.md) | Authentication (Cognito). |
| [billing.md](billing.md) | Stripe billing and subscriptions. |
| [entitlements.md](entitlements.md) | Authorization, RBAC, feature gating. |
| [workspaces.md](workspaces.md) | Multi-tenancy and team management. |
| [i18n.md](i18n.md) | Internationalization. |
| [uix.md](uix.md) | UI foundation and theming. |
| [saas-layer.md](saas-layer.md) | The `saas` meta-layer (dashboard shell). |
| [saas-app.md](saas-app.md) | The dashboard application and instance configuration. |
| [notifications.md](notifications.md) | In-app notifications — **Future**, not implemented; roadmap epic E14. |
| [onboarding.md](onboarding.md) | User onboarding wizard — **Future**, not implemented; roadmap epic E15. |
