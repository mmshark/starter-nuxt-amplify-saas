## AGENTS.md — AI Agent & Contributor Operational Guide

This document is the **single source of truth** for working with this repository. It provides clear guidelines for AI agents, ensuring consistency, security, and scalability in code analysis, generation, or modification.

## CRITICAL INSTRUCTIONS - READ BEFORE ANY TASK

**ALL agents and contributors MUST consult these instructions before performing any task:**

### Coherence Principle
This document must remain the single source of truth. Any deviation must result in an immediate update of these instructions to prevent future inconsistencies.

### Consistency Validation
1. **ALWAYS** validate that any instruction does NOT contradict the instructions, patterns, or architecture documented in this file.
2. **IF CONTRADICTION EXISTS**, immediately inform the user about the detected inconsistency and the specific sections affected. If unsure, ask.
3. **DO NOT PROCEED** with contradictory changes without explicit user confirmation.
4. **IF THE USER CONFIRMS TO PROCEED** despite the contradiction, apply the changes by adding a comment with the prefix "EXCEPTION:".

## Tech Stack
- **Package Manager**: pnpm@10.13.1 (use `corepack enable`).
- **Runtime**: Node.js ≥20.19 (Amplify Console: Node 22 override).
- **Frontend**: Nuxt 4.x + TypeScript.
- **Backend**: AWS Amplify Gen2 (Cognito, DynamoDB, AppSync).
- **Billing**: Stripe (portal-first approach).
- **UI**: `@nuxt/ui` v4 (MIT license, not the paid Pro package) + TailwindCSS v4.

## Architecture

This repository is a pnpm monorepo that composes Nuxt 4 apps from Nuxt Layers and an AWS Amplify Gen2 backend. The architecture optimizes for reuse, SSR safety, and clean contracts between layers and apps.

### Monorepo
- Managed with `pnpm` and workspaces.
- Share code via packages.
- Prefer package imports over relative paths (`../..`). Layer packages are named `@mmshark/<layer>-layer` (e.g. `@mmshark/auth-layer`, `@mmshark/billing-layer`); the three apps are `@starter-nuxt-amplify-saas/{backend,saas,landing}`.
- Strict TypeScript typing enforced across all workspaces.
- Align with Node ≥20.19; use `corepack enable` for pnpm.

### Apps (apps/)
- There are two types of applications: frontend and backend.
- Frontend applications are based on Nuxt 4 and can be composed by using the layers.
- Backend applications are based on Amplify Gen2.
- The `amplify` layer (layers/amplify/) provides client/server integration between Nuxt and Amplify.

### Nuxt Layers (layers/)
- Use Nuxt Layers for reusable code. Each layer provides composables, components, plugins, and optionally server routes or utilities.

**Adding a New Layer**:
1. Create `layers/<name>/` with `nuxt.config.ts`, `package.json`, and minimal structure.
2. Expose APIs via composables, components, and, if needed, namespaced `server/api` routes.
3. Document in `layers/<name>/README.md` and reference in `AGENTS.md` if it introduces new patterns.

**Layers Overview** (9 layers, package names `@mmshark/<layer>-layer`):
- `amplify`: client/server integration between Nuxt and AWS Amplify (Amplify config, IAM/userPool Data clients, `withAmplifyAuth`/`withAmplifyPublic` server helpers, workspace-membership Lambda invocation, logger).
- `auth`: authentication (Cognito sign-in/sign-up/email verification, session management via `useState`-backed composables, route middleware, profile read).
- `billing`: Stripe integration — portal-first subscription management, checkout/portal Nitro routes, pricing components; the Stripe webhook itself is a standalone Lambda Function URL owned by `apps/backend`, not a route in this layer.
- `workspaces`: multi-tenant workspace management — workspace CRUD, member invitations, and the group-based (Cognito groups) tenant-isolation model. Client writes to tenant tables are never direct; they proxy through the backend's `workspace-membership` Lambda.
- `entitlements`: authorization/RBAC — plan-based feature gating (`free`/`starter`/`pro`/`enterprise`), permission checks (e.g. `manage-billing`), server-side enforcement via `getWorkspaceContext`/`requirePermission`.
- `i18n`: internationalization — multi-language support and date/currency formatting via `@nuxtjs/i18n`.
- `uix`: UI components and theme, built on `@nuxt/ui` v4 + Tailwind v4.
- `saas`: meta-layer that composes all of the above (`amplify`, `auth`, `billing`, `workspaces`, `entitlements`, `uix`, `i18n`) into a complete dashboard application shell (layouts, navigation, pages) for `apps/saas` to extend.
- `debug`: development-only debugging pages/utilities (dev-only; 404s in production builds).

### Repository Structure
```
starter-nuxt-amplify-saas/
├── apps/
│   ├── backend/             # AWS Amplify Gen2 backend
│   │   └── amplify/         # Entry: backend.ts, auth/resource.ts, data/resource.ts
│   ├── saas/                # Nuxt 4 dashboard app (SSR)
│   │   ├── app/app.config.ts # Instance-specific configuration
│   │   └── amplify.yml      # Deployment config
│   └── landing/             # Nuxt 4 marketing site (SSG)
├── layers/                  # Reusable Nuxt layers (published as @mmshark/<layer>-layer)
│   ├── amplify/            # Amplify client/server integration + logger
│   ├── auth/               # Authentication (Cognito + Amplify)
│   ├── billing/            # Stripe integration (portal-first)
│   ├── workspaces/         # Multi-tenant workspaces, members, invitations
│   ├── entitlements/       # Authorization, RBAC, plan-based feature gating
│   ├── uix/                # UI components & theme (@nuxt/ui v4)
│   ├── i18n/               # Internationalization
│   ├── saas/               # Meta-layer composing the full dashboard shell
│   └── debug/              # Development-only debugging utilities
└── package.json            # Workspace root with top-level scripts
```

### Data Authorization & Multi-Tenancy Security Model

`apps/backend/amplify/data/resource.ts` sets `defaultAuthorizationMode: "userPool"`. There is **no general-purpose public API key**: `allow.publicApiKey()` appears exactly once, read-only, on `SubscriptionPlan` (the landing page's public pricing table).

Tenant tables — `Workspace`, `WorkspaceMember`, `WorkspaceSubscription`, `WorkspaceInvitation` — are **read-only for clients**. Read access is granted via dynamic, per-workspace Cognito groups:
- `ws:<workspaceId>:members` — read access for every member (any role)
- `ws:<workspaceId>:admins` — an OWNER/ADMIN marker group (not itself a write grant)

**No tenant table has a client write grant.** Every create/update/delete goes through one of three privileged Lambda functions, each holding an `allow.resource(...)` grant on the models it needs, and each independently re-verifying the caller (never trusting the request payload):
- **`workspace-membership`** (`apps/backend/amplify/functions/workspace-membership/`) — handles workspace create/update/delete, invitations (create/accept/decline), member role changes/removal, and billing bootstrap. Invoked from Nitro routes via `layers/amplify/server/utils/workspaceMembership.ts`, signed with the *caller's own* authenticated Identity Pool credentials; the Lambda calls Cognito `GetUser` on the forwarded access token to establish real identity, then re-checks OWNER/ADMIN role against the DB before acting. Also creates/deletes the Cognito groups above and adds/removes users from them.
- **`stripe-webhook`** (`apps/backend/amplify/functions/stripe-webhook/`) — exposed as a public **Lambda Function URL** (`FunctionUrlAuthType.NONE`; no IAM principal may invoke it — only Stripe hitting the URL). It verifies the Stripe signature itself using the `STRIPE_WEBHOOK_SECRET` Amplify secret before parsing/persisting anything, then syncs `WorkspaceSubscription` and records `ProcessedStripeEvent` for idempotency. **Stripe must be configured to call this Function URL directly — there is no Nitro `/api/billing/webhook` route.**
- **`postConfirmation`** (`apps/backend/amplify/auth/post-confirmation/`) — the Cognito post-confirmation trigger; creates a new user's personal workspace, owner membership, free subscription, and the two Cognito groups *before* the user's first sign-in (so first tokens already carry the group claims).

**Operator follow-ups required after deploying/redeploying the backend** (not automated — see `layers/billing/README.md`/`apps/backend/README.md` for full detail):
1. Set the `STRIPE_WEBHOOK_SECRET` Amplify secret (`pnpm backend:sandbox:secrets` for sandbox; Amplify Console → Secrets for deployed branches).
2. Read `custom.stripeWebhookUrl` from the freshly generated `amplify_outputs.json` and register that URL as the Stripe webhook endpoint (dashboard, or `stripe listen --forward-to` for local dev) — remove/disable any old endpoint pointing at a Nitro route.
3. **Cognito group backfill**: any pre-existing tenant rows (e.g. a long-lived sandbox from before this model existed) have no `readerGroups`/`writerGroups` and no corresponding Cognito groups — those workspaces are invisible to their members until backfilled (create the groups, add members, stamp the group fields on existing rows). Fresh environments need no backfill.
4. **Token refresh after group changes**: Cognito group membership is stamped into JWTs at token-issue time. `useWorkspaces.createWorkspace()` force-refreshes the session after creating a workspace, but accepting an invitation or a role change does not auto-refresh the accepting/affected user's session — they must sign out/in or the app must call `fetchAuthSession({ forceRefresh: true })` before the new access becomes visible. A removed member's existing tokens also keep working until they expire (default ~1h) even though the corresponding `WorkspaceMember` row is gone — Nitro routes deny immediately (fail-closed), but a direct AppSync read is not revoked until the token expires.

### Documentation Structure

The `doc/` directory contains comprehensive project documentation for both human developers and AI agents. **All contributors MUST consult relevant documentation before making changes.**

#### Product Requirements (doc/prd/)
Detailed product specifications for each layer. **MUST be consulted before implementing features.**

Available PRDs:
- [Amplify Layer](doc/prd/amplify.md) - AWS integration specifications
- [Auth Layer](doc/prd/auth.md) - Authentication and user management
- [Billing Layer](doc/prd/billing.md) - Stripe integration and subscription management
- [Entitlements Layer](doc/prd/entitlements.md) - Authorization, RBAC, and feature gating
- [Workspaces Layer](doc/prd/workspaces.md) - Multi-tenancy and team management
- [i18n Layer](doc/prd/i18n.md) - Internationalization functionality
- [UIX Layer](doc/prd/uix.md) - UI components and design system
- [SaaS App](doc/prd/saas.md) - Main dashboard application

Archived (future features, not yet built — see `doc/archive/`):
- [Notifications](doc/archive/prd/notifications.md) - Notification system (not implemented)
- [Onboarding](doc/archive/prd/onboarding.md) - User onboarding flows (not implemented)

#### Architecture Decisions (doc/adr/)

##### Required Code Patterns (doc/adr/patterns/)
**MANDATORY patterns that MUST be followed in all code:**

- **[API Server Pattern](doc/adr/patterns/api-server.pattern.md)** - Secure server-side API routes
- **[Composables Pattern](doc/adr/patterns/composables.pattern.md)** - SSR-safe state management
- **[Error Handling Pattern](doc/adr/patterns/error-handling.pattern.md)** - Consistent error management
- **[Git Conventions](doc/adr/patterns/git-conventions.pattern.md)** - Commit message format
- **[Layers Pattern](doc/adr/patterns/layers.pattern.md)** - Layer structure and composition
- **[Repository Structure](doc/adr/patterns/repository-structure.pattern.md)** - File organization

#### Compliance Analysis (doc/analysis/)
Automated and manual compliance reports for code quality validation:
- **gap-analysis-code-vs-prd.md** - Feature implementation vs PRD requirements
- **gap-analysis-code-vs-adr.md** - Code vs Architecture Decision Records/patterns compliance
- **layer-dependencies.md** - Layer dependency validation

#### Implementation Plans (doc/plan/)
Layer-specific implementation roadmaps and task breakdowns.

### Compliance Requirements

**All contributors and AI agents MUST adhere to the following:**

1. **Consult PRDs First**
   - Read the relevant PRD in `doc/prd/` before implementing any feature
   - Ensure your implementation matches the specifications exactly
   - If requirements are unclear, ask for clarification

2. **Follow Code Patterns Strictly**
   - All patterns defined in `doc/adr/patterns/` are MANDATORY
   - Review applicable patterns before writing code
   - Code that violates patterns may be rejected during review

3. **Validate Compliance**
   - Check that your implementation aligns with both PRDs and patterns
   - Review relevant analysis documents in `doc/analysis/`
   - Run tests and type checks to ensure correctness

#### Exception Process

If a deviation from PRDs or patterns is absolutely necessary:

1. **Request Explicit Approval**
   - Stop implementation immediately
   - Explain why the standard approach cannot be followed
   - Wait for explicit user confirmation before proceeding

2. **Document the Exception**
   - Add a code comment in this format:
     ```typescript
     // EXCEPTION: [Brief explanation of why pattern/PRD cannot be followed]
     // Approved: [Date] - [Reason for approval]
     // Alternative: [Description of alternative approach used]
     ```

3. **Update Documentation if Needed**
   - If the exception becomes a recurring pattern, update the relevant documentation
   - Document the new pattern in `doc/adr/patterns/` or update existing PRD

#### Non-Compliance Consequences

Failing to follow PRDs and patterns results in:
- ❌ Code rejection during review
- ❌ Increased technical debt and maintenance burden
- ❌ Inconsistencies and bugs across the codebase
- ❌ Difficulty for other contributors to understand and modify code

**Always prioritize consistency and adherence to established patterns.**

## Patterns

This section outlines standardized patterns for consistency, scalability, and maintainability across the repository. Update this section for any new or modified patterns.

### Standardized Patterns

For consistency and scalability, we follow strict architectural patterns. Refer to the detailed documentation for each pattern:

| Pattern | Description | Documentation |
| :--- | :--- | :--- |
| **Nuxt Layers** | Structure, encapsulation, composition, and dependency management. | [layers.pattern.md](doc/adr/patterns/layers.pattern.md) |
| **Composables** | SSR-safe state management and logic sharing. | [composables.pattern.md](doc/adr/patterns/composables.pattern.md) |
| **API Server** | Secure and consistent server-side API routes (standard). | [api-server.pattern.md](doc/adr/patterns/api-server.pattern.md) |
| **Git Conventions** | Semantic versioning and commit message format. | [git-conventions.pattern.md](doc/adr/patterns/git-conventions.pattern.md) |
| **Repository Structure** | Organization of context, operations, and infrastructure. | [repository-structure.pattern.md](doc/adr/patterns/repository-structure.pattern.md) |

### REST API Pattern (Standard)

For all server-side API development, **REST API endpoints** are the standard pattern. Use Nuxt's built-in `server/api` routing with authentication wrappers.

- **Endpoints**: Define endpoints in `layers/<layer>/server/api/<layer>/`.
- **Authentication**: Use `withAmplifyAuth()` for protected routes, `withAmplifyPublic()` for public routes.
- **Validation**: Use Zod schemas for input validation.
- **Errors**: Use `createError()` for consistent error responses.

See [api-server.pattern.md](doc/adr/patterns/api-server.pattern.md) for the complete pattern documentation.

## Quick Start
```bash
corepack enable
pnpm install
pnpm backend:sandbox:init
pnpm amplify:sandbox:generate-outputs
pnpm amplify:sandbox:generate-graphql-client-code
pnpm saas:dev
```

- SaaS: `http://localhost:3000` (or `http://localhost:3001` if 3000 occupied)
- Landing: `pnpm landing:dev` → `http://localhost:3001`
- Secrets: `apps/saas/.env` holds `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` (copy from `layers/billing/.env.example`, never commit). `STRIPE_WEBHOOK_SECRET` is set as an Amplify **sandbox secret** instead (`pnpm backend:sandbox:secrets`) — the Nuxt app never reads it; the `stripe-webhook` Lambda verifies signatures itself. See "Billing" below.

## Essential Commands

### Development
- `pnpm saas:dev` — Main dashboard app dev server
- `pnpm landing:dev` — Marketing site dev server

### Backend
- `pnpm backend:sandbox:init` — Deploy AWS resources to dev account
- `pnpm backend:sandbox:delete` — Clean up sandbox resources
- `pnpm amplify:sandbox:generate-outputs` — Required before first frontend build
- `pnpm amplify:sandbox:generate-graphql-client-code` — Generate types + operations
- `pnpm backend:sandbox:seed` — Run sandbox seed (plans + users)
- `pnpm backend:sandbox:seed:plans` — Seed only billing plans from JSON
- `pnpm backend:sandbox:seed:users` — Seed only users from JSON

### Building
- `pnpm --filter @starter-nuxt-amplify-saas/saas build` — Production build
- `pnpm --filter @starter-nuxt-amplify-saas/landing build` — Static generation
- `pnpm --filter @starter-nuxt-amplify-saas/saas preview` — Test production build

### Billing
- `pnpm billing:stripe:login` — Authenticate Stripe CLI
- `pnpm billing:sandbox:stripe:seed` — Create the Stripe products/prices fixtures (`amplify/seed/data/stripe.json`) in your Stripe test account
- `pnpm backend:sandbox:seed:plans` — Sync `SubscriptionPlan` rows FROM Stripe (reads products/prices + `app_plan_id`/`monthly_price`/`yearly_price`/`features` metadata) — there is no local `plans.json`; Stripe is the source of truth
- `pnpm billing:stripe:listen` — Forward Stripe events to the `stripe-webhook` Lambda's Function URL for local testing (`STRIPE_WEBHOOK_URL` must point at `custom.stripeWebhookUrl` from `amplify_outputs.json`)

### Testing
- `pnpm lint` / `pnpm lint:fix` — ESLint (flat config, `@nuxt/eslint`)
- `pnpm test` — Vitest unit tests (composables, Nitro routes, pure utils)
- `pnpm saas:test:e2e` — Playwright e2e suite (from `apps/saas`; requires a live Amplify sandbox + real Cognito sign-up, not run in default CI). Narrower slices: `saas:test:e2e:auth`, `saas:test:e2e:billing`; also `saas:test:e2e:headed`, `saas:test:e2e:ui`, `saas:test:e2e:setup` (installs the Playwright browser), `saas:test:e2e:clean`

### Logging
- `layers/amplify/utils/logger.ts` exports `createLogger(scope: string)`, a small environment-aware logger (`debug`/`info`/`warn`/`error`, prefixed `[scope]`) — `debug`/`info` are dev-only (`import.meta.dev`), `warn`/`error` always log. Used across server routes and Lambdas instead of ad hoc `console.*` calls; prefer it for new server-side code.

## Development Workflows

### Frontend Feature Implementation
1. **Consult PRD**: Read relevant PRD in `doc/prd/` and review applicable patterns in `doc/adr/patterns/`
2. **Plan**: Determine if feature belongs in a layer (reusable) or app (instance-specific)
3. **Develop**: Use layers for composables/components, `apps/saas/app/` for pages
4. **Protect**: Add `definePageMeta({ middleware: 'auth' })` to protected pages
5. **Configure**: Update `apps/saas/app/app.config.ts` for instance-specific settings
6. **Test**: Run `pnpm saas:dev` and verify functionality
7. **Validate**: Ensure implementation matches PRD specifications and follows patterns

### Backend Schema Changes
1. **Consult PRD**: Review data model specifications in relevant `doc/prd/` files
2. **Edit**: Modify `apps/backend/amplify/data/resource.ts`
3. **Generate**: `pnpm amplify:sandbox:generate-graphql-client-code`
4. **Verify**: Check generated types compile
5. **Test**: Run app and verify affected flows
6. **Validate**: Ensure schema matches PRD data model specifications

### Billing Configuration
Plans are **not** configured in a local JSON file — Stripe is the source of truth and the app syncs plans FROM Stripe:
1. **Configure in Stripe**: create/edit Products and Prices in your Stripe test account (or via `pnpm billing:sandbox:stripe:seed`, which applies the fixture at `apps/backend/amplify/seed/data/stripe.json`), setting `app_plan_id`/`monthly_price`/`yearly_price`/`currency`/`features` (pipe-separated) in the Product's metadata
2. **Sync (Seed)**: `pnpm backend:sandbox:seed:plans` reads Stripe's products/prices via the sandbox secret `STRIPE_SECRET_KEY` and upserts matching `SubscriptionPlan` rows
3. **Restart**: Restart dev server if UI caches plan data
4. **Test**: Verify plans load via the billing API and match what's in the Stripe dashboard

### Bug Fixes
1. **Reproduce**: Under `pnpm saas:dev`
2. **Locate**: Find the smallest layer/app owning the logic
3. **Review**: Check relevant PRD and patterns to understand intended behavior
4. **Fix**: Edit code following applicable patterns
5. **Test**: Verify fix resolves issue without breaking existing functionality
6. **Document**: Update relevant README if behavior changes

## Contribution Standards

### Git Conventions

We follow the **Conventional Commits** pattern. Refer to [git-conventions.pattern.md](doc/adr/patterns/git-conventions.pattern.md) for the full specification and type definitions.

**Project Scopes:**
- `billing`, `auth`, `i18n`, `saas`, `amplify`, `uix`, `workspaces`, `entitlements`, `debug`, `deps`, `docs`

### Code Standards
- **TypeScript**: Strict mode enabled
- **Architecture**: Prefer layers for reusable code, apps for instance-specific
- **UI**: Use `@nuxt/ui` v4 components; valid `color` values are exactly `primary | secondary | success | info | warning | error | neutral` (no `red/green/blue/yellow/gray/orange/black/purple`)
- **Naming**:
  - Components: `PascalCase`
  - Composables: `useX`
  - Pages: `kebab-case`
  - API routes: `kebab-case`

### Pull Requests
- Keep PRs small and atomic
- Update relevant READMEs when changing layer APIs
- Reference this file when behavior/patterns change

## Troubleshooting

**"Amplify not configured"**
→ Run `pnpm amplify:sandbox:generate-outputs`

**Node native binding errors in Amplify Console**
→ Set Node 22 override (see README.md)

**Plans not loading in UI**
→ Ensure you ran `pnpm backend:sandbox:seed:plans` and that `STRIPE_SECRET_KEY` is set as a sandbox secret (`pnpm backend:sandbox:secrets`). Plans are synced FROM your Stripe account's Products/Prices — there is no local plans config file; if none load, check that Stripe has active products (e.g. via `pnpm billing:sandbox:stripe:seed`).

**GraphQL types out of sync**
→ Run `pnpm amplify:sandbox:generate-graphql-client-code`

**Port 3000 already in use**
→ Nuxt will auto-fallback to 3001

## Verification Checklist

Run this sequence to verify you can work with the project:

```bash
# Setup
corepack enable && pnpm install

# Backend
pnpm backend:sandbox:init
pnpm amplify:sandbox:generate-outputs
pnpm amplify:sandbox:generate-graphql-client-code

# Seed (optional)
pnpm backend:sandbox:seed:plans
pnpm backend:sandbox:seed:users

# Frontend
pnpm saas:dev
```

### Internal Documentation
- **Project setup & deployment**: `README.md`
- **Layer documentation**: `layers/*/README.md`
- **Build configs**: `apps/*/amplify.yml`
- **Instance configuration**: `apps/saas/app/app.config.ts`
- **Product Requirements**: `doc/prd/*.md` - Feature specifications by layer
- **Architecture Decisions**: `doc/adr/*.md` - ADRs and cross-cutting concerns
- **Code Patterns**: `doc/adr/patterns/*.md` - Mandatory implementation patterns
- **Compliance Reports**: `doc/analysis/*.md` - Code vs specification validation
- **Implementation Plans**: `doc/plan/*.md` - Layer roadmaps and task breakdowns

### External Documentation & Resources

#### Nuxt Framework
- **Nuxt 4 Documentation**: https://nuxt.com/docs
- **Nuxt UI Components (v4, MIT)**: https://ui.nuxt.com/components
- **Nuxt Layers**: https://nuxt.com/docs/guide/going-further/layers

#### AWS Amplify
- **AWS Amplify Gen 2 Documentation**: https://docs.amplify.aws/
- **Amplify JS API Reference**: https://aws-amplify.github.io/amplify-js/api/index.html
- **Amplify Auth (Vue)**: https://docs.amplify.aws/vue/build-a-backend/auth/
- **Amplify Data (Vue)**: https://docs.amplify.aws/vue/build-a-backend/data/
- **Amplify Storage (Vue)**: https://docs.amplify.aws/vue/build-a-backend/storage/
- **Amplify + Nuxt SSR Integration**: https://docs.amplify.aws/vue/build-a-backend/server-side-rendering/nuxt/

#### Stripe Integration
- **Stripe API Documentation**: https://docs.stripe.com/api
- **Stripe Customer Portal**: https://docs.stripe.com/billing/subscriptions/integrating-customer-portal
- **Stripe Webhooks**: https://docs.stripe.com/webhooks

#### TypeScript & Tooling
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Zod Validation**: https://zod.dev/
- **TailwindCSS**: https://tailwindcss.com/docs
