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

The `.context/` directory is the **single source of truth** for project documentation, for both human developers and AI agents. **All contributors MUST consult relevant documentation before making changes.**

**Startup protocol**: read `.context/patterns/index.md` at the start of every session — it is the compact index of all mandatory patterns.

#### Product Requirements (.context/prd/)
Detailed product specifications for each layer. **MUST be consulted before implementing features.**

Available PRDs:
- [Product Definition](.context/prd/current.md) - What the starter is and its architectural commitments
- [Amplify Layer](.context/prd/amplify.md) - AWS integration specifications
- [Auth Layer](.context/prd/auth.md) - Authentication and user management
- [Billing Layer](.context/prd/billing.md) - Stripe integration and subscription management
- [Entitlements Layer](.context/prd/entitlements.md) - Authorization, RBAC, and feature gating
- [Workspaces Layer](.context/prd/workspaces.md) - Multi-tenancy and team management
- [i18n Layer](.context/prd/i18n.md) - Internationalization functionality
- [UIX Layer](.context/prd/uix.md) - UI components and design system
- [SaaS Meta-Layer](.context/prd/saas-layer.md) - Application shell composed by `layers/saas`
- [SaaS App](.context/prd/saas-app.md) - Main dashboard application

Future features (target specs, not yet built — marked `Status: Future`):
- [Notifications](.context/prd/notifications.md) - Notification system (not implemented)
- [Onboarding](.context/prd/onboarding.md) - User onboarding flows (not implemented)

#### Required Code Patterns (.context/patterns/)
**MANDATORY patterns that MUST be followed in all code.** Start from the index: [.context/patterns/index.md](.context/patterns/index.md).

- **[API Server Pattern](.context/patterns/api-server.md)** - Secure server-side API routes
- **[Composables Pattern](.context/patterns/composables.md)** - SSR-safe state management
- **[Error Handling Pattern](.context/patterns/error-handling.md)** - Consistent error management
- **[Git Conventions](.context/patterns/git-conventions.md)** - Commit message format
- **[Layers Pattern](.context/patterns/layers.md)** - Layer structure and composition
- **[Repository Structure](.context/patterns/repository-structure.md)** - File organization
- **[App Config Composition](.context/patterns/app-config-composition.md)** - Layer/app config merging
- **[Navigation Configuration](.context/patterns/navigation-config.md)** - Menu composition

#### Architecture (.context/architecture/)
- **[overview.md](.context/architecture/overview.md)** - Verified architecture reference (system, layers, data flow)
- **[decisions/](.context/architecture/decisions/)** - Architecture Decision Records (ADR-001, ADR-002, …)
- **[tech-debt.md](.context/architecture/tech-debt.md)** - Verified technical-debt ledger; check it before claiming a capability works

#### Operations (.context/operations/)
Operational guides: [deployment](.context/operations/deployment.md), [environments](.context/operations/environments.md), [debugging](.context/operations/debugging.md), [make-it-yours](.context/operations/make-it-yours.md), [using-published-layers](.context/operations/using-published-layers.md).

#### Audits (.context/audits/)
Verified audit checklists (`checklists/`) and reports (`reports/`) validating code against documentation claims — e.g. [saas-starter-features-2026-07-08.md](.context/audits/reports/saas-starter-features-2026-07-08.md).

#### Planning (.context/prd/roadmap.md + .context/epic/)
[roadmap.md](.context/prd/roadmap.md) is the single source of truth for development sequencing; each epic's spec/design/plan/tasks live in `.context/epic/<id>/`.

### Compliance Requirements

**All contributors and AI agents MUST adhere to the following:**

1. **Consult PRDs First**
   - Read the relevant PRD in `.context/prd/` before implementing any feature
   - Ensure your implementation matches the specifications exactly
   - If requirements are unclear, ask for clarification

2. **Follow Code Patterns Strictly**
   - All patterns defined in `.context/patterns/` are MANDATORY — start from `.context/patterns/index.md`
   - Review applicable patterns before writing code
   - Code that violates patterns may be rejected during review

3. **Validate Compliance**
   - Check that your implementation aligns with both PRDs and patterns
   - Review relevant audit reports in `.context/audits/` and the tech-debt ledger in `.context/architecture/tech-debt.md`
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
   - Document the new pattern in `.context/patterns/` (and append it to `.context/patterns/index.md`) or update the existing PRD

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
| **Nuxt Layers** | Structure, encapsulation, composition, and dependency management. | [layers.md](.context/patterns/layers.md) |
| **Composables** | SSR-safe state management and logic sharing. | [composables.md](.context/patterns/composables.md) |
| **API Server** | Secure and consistent server-side API routes (standard). | [api-server.md](.context/patterns/api-server.md) |
| **Git Conventions** | Semantic versioning and commit message format. | [git-conventions.md](.context/patterns/git-conventions.md) |
| **Repository Structure** | Organization of context, operations, and infrastructure. | [repository-structure.md](.context/patterns/repository-structure.md) |

### REST API Pattern (Standard)

For all server-side API development, **REST API endpoints** are the standard pattern. Use Nuxt's built-in `server/api` routing with authentication wrappers.

- **Endpoints**: Define endpoints in `layers/<layer>/server/api/<layer>/`.
- **Authentication**: Use `withAmplifyAuth()` for protected routes, `withAmplifyPublic()` for public routes.
- **Validation**: Use Zod schemas for input validation.
- **Errors**: Use `createError()` for consistent error responses.

See [api-server.md](.context/patterns/api-server.md) for the complete pattern documentation.

## Operational Interface (Taskfile)

**[`taskfile.yaml`](taskfile.yaml) is the single operational interface for this repository.** It follows the Ontopix [Taskfile as Contract](https://docs.ontopix.dev/engineering/patterns/organizational/taskfile-contract) pattern: colon-separated `namespace:action[:target]` names, one `desc:` per task, `.env` via `dotenv`. Run `task --list` to discover operations.

**Agents MUST use Taskfile tasks when they exist** — do not invoke `pnpm`/`eslint`/`vitest`/`ampx` directly for an operation that has a task. The `pnpm` scripts in `package.json` remain the *underlying implementation* the tasks delegate to (and stay usable for ad-hoc slicing); the tasks are the *interface*.

Standard namespaces:

| Namespace | Key tasks | Purpose |
| :--- | :--- | :--- |
| `setup:*` | `setup`, `setup:install`, `setup:clean` | First-use setup (env + deps). `task setup` is the post-clone entry point. |
| `dev:*` | `dev:saas`, `dev:landing` | Run an app dev server. |
| `lint:*` | `lint:check`, `lint:fix`, `lint:types`, `lint:all` | ESLint + `nuxt typecheck`. |
| `test:*` | `test:unit`, `test:e2e`, `test:all` | Vitest (`test:all`); Playwright e2e needs a live sandbox and is excluded from `test:all`. |
| `ci:*` | `ci:lint`, `ci:test`, `ci:build`, `ci:all` | Local mirror of CI — **if `task ci:all` passes, CI passes.** |
| `build:*` | `build:saas`, `build:landing`, `build:all` | Production builds (SaaS SSR + landing static). |
| `amplify:*` | `amplify:sandbox:{init,delete,secrets,generate,seed}`, `amplify:outputs:stub` | AWS Amplify Gen2 cloud sandbox. Guarded by `amplify:checks` (`AWS_PROFILE`, `SANDBOX_STACK_NAME`). |
| `billing:*` | `billing:stripe:{login,listen,seed}` | Stripe CLI operations. |
| `clean` | `clean`, `clean:{nuxt,amplify,test,logs,node}` | Reset the working tree. |

> This repo has **no local (LocalStack) sandbox**, so the pattern's `sandbox:*` namespace does not apply; the Amplify *cloud* sandbox lives under `amplify:*`. Copy `.env.example` → `.env` (or run `task setup:prepare`) and set `AWS_PROFILE` / `SANDBOX_STACK_NAME` / `STRIPE_SECRET_KEY` before running `amplify:*` tasks.

## Quick Start
```bash
task setup                        # corepack + pnpm install (creates .env from .env.example)
# edit .env: set AWS_PROFILE and SANDBOX_STACK_NAME
task amplify:sandbox:init         # deploy AWS sandbox resources
task amplify:sandbox:generate     # generate amplify_outputs.json + GraphQL client code
task dev:saas                     # http://localhost:3000
```

- SaaS: `http://localhost:3000` (or `http://localhost:3001` if 3000 occupied)
- Landing: `pnpm landing:dev` → `http://localhost:3001`
- Secrets: `apps/saas/.env` holds `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` (copy from `layers/billing/.env.example`, never commit). `STRIPE_WEBHOOK_SECRET` is set as an Amplify **sandbox secret** instead (`pnpm backend:sandbox:secrets`) — the Nuxt app never reads it; the `stripe-webhook` Lambda verifies signatures itself. See "Billing" below.

## Essential Commands

> These `pnpm` scripts are the implementation the Taskfile delegates to. Prefer the equivalent `task` (see [Operational Interface](#operational-interface-taskfile)) as the entry point; e.g. `task dev:saas` over `pnpm saas:dev`, `task ci:all` over running lint/test/build by hand.

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
- `layers/amplify/utils/logger.ts` exports `createLogger(scope: string)`, a small environment-aware logger (`debug`/`info`/`warn`/`error`, prefixed `[scope]`) — `debug`/`info` are dev-only (`import.meta.dev`), `warn`/`error` always log. **Not yet adopted**: existing server routes and Lambdas still use ad hoc `console.*` calls (tracked as DEAD-05 in `.context/architecture/tech-debt.md`); prefer `createLogger` for new server-side code.

## Development Workflows

### Frontend Feature Implementation
1. **Consult PRD**: Read relevant PRD in `.context/prd/` and review applicable patterns via `.context/patterns/index.md`
2. **Plan**: Determine if feature belongs in a layer (reusable) or app (instance-specific)
3. **Develop**: Use layers for composables/components, `apps/saas/app/` for pages
4. **Protect**: Add `definePageMeta({ middleware: 'auth' })` to protected pages
5. **Configure**: Update `apps/saas/app/app.config.ts` for instance-specific settings
6. **Test**: Run `pnpm saas:dev` and verify functionality
7. **Validate**: Ensure implementation matches PRD specifications and follows patterns

### Backend Schema Changes
1. **Consult PRD**: Review data model specifications in relevant `.context/prd/` files
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

We follow the **Conventional Commits** pattern. Refer to [git-conventions.md](.context/patterns/git-conventions.md) for the full specification and type definitions.

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
- **Product Requirements**: `.context/prd/*.md` - Feature specifications by layer
- **Architecture**: `.context/architecture/` - Overview, decision records (`decisions/`), and the tech-debt ledger
- **Code Patterns**: `.context/patterns/*.md` - Mandatory implementation patterns (index: `.context/patterns/index.md`)
- **Operations Guides**: `.context/operations/*.md` - Deployment, environments, debugging, customization
- **Audit Reports**: `.context/audits/` - Code vs specification validation (checklists + reports)
- **Planning**: `.context/prd/roadmap.md` + `.context/epic/*/` - Roadmap and epic specs/plans/tasks

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
