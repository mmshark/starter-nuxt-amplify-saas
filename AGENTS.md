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
- **UI**: Nuxt UI Pro + TailwindCSS.

## Architecture

This repository is a pnpm monorepo that composes Nuxt 4 apps from Nuxt Layers and an AWS Amplify Gen2 backend. The architecture optimizes for reuse, SSR safety, and clean contracts between layers and apps.

### Monorepo
- Managed with `pnpm` and workspaces.
- Share code via packages.
- Prefer package imports (@starter-nuxt-amplify-saas/<layer>) over relative paths (../..).
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

**Layers Overview**:
- `amplify`: provides client/server integration between Nuxt and Amplify.
- `auth`: provides authentication functionality including sign-in, sign-up, email verification, session management, route protection, and user profile management with GraphQL integration.
- `billing`: provides Stripe integration with subscription management and customer portal.
- `i18n`: provides internationalization functionality including multi-language support and formatting utilities.
- `uix`: provides UI components and theme.

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
├── layers/                  # Reusable Nuxt layers
│   ├── auth/               # Authentication (Cognito + Amplify)
│   ├── billing/            # Stripe integration (portal-first)
│   ├── amplify/            # Amplify client configuration
│   ├── uix/                # UI components & theme
│   ├── i18n/               # Internationalization
│   └── debug/              # Development utilities
└── package.json            # Workspace root with top-level scripts
```

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
- [tRPC Layer](doc/prd/trpc.md) - Type-safe API communication
- [UIX Layer](doc/prd/uix.md) - UI components and design system
- [SaaS App](doc/prd/saas.md) - Main dashboard application
- [Notifications](doc/prd/notifications.md) - Notification system
- [Onboarding](doc/prd/onboarding.md) - User onboarding flows

#### Architecture Decisions (doc/ard/)

##### Required Code Patterns (doc/ard/patterns/)
**MANDATORY patterns that MUST be followed in all code:**

- **[API Server Pattern](doc/ard/patterns/api-server.pattern.md)** - Secure server-side API routes
- **[Composables Pattern](doc/ard/patterns/composables.pattern.md)** - SSR-safe state management
- **[Error Handling Pattern](doc/ard/patterns/error-handling.pattern.md)** - Consistent error management
- **[Git Conventions](doc/ard/patterns/git-conventions.pattern.md)** - Commit message format
- **[Layers Pattern](doc/ard/patterns/layers.pattern.md)** - Layer structure and composition
- **[Repository Structure](doc/ard/patterns/repository-structure.pattern.md)** - File organization
- **[tRPC Pattern](doc/ard/patterns/trpc.pattern.md)** - Type-safe API communication

#### Compliance Analysis (doc/analysis/)
Automated and manual compliance reports for code quality validation:
- **gap-analysis-code-vs-prd.md** - Feature implementation vs PRD requirements
- **gap-analysis-code-vs-ard-patterns.md** - Billing implementation analysis
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
   - All patterns defined in `doc/ard/patterns/` are MANDATORY
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
   - Document the new pattern in `doc/ard/patterns/` or update existing PRD

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
| **Nuxt Layers** | Structure, encapsulation, composition, and dependency management. | [layers.pattern.md](doc/ard/patterns/layers.pattern.md) |
| **Composables** | SSR-safe state management and logic sharing. | [composables.pattern.md](doc/ard/patterns/composables.pattern.md) |
| **API Server** | Secure and consistent server-side API routes (standard). | [api-server.pattern.md](doc/ard/patterns/api-server.pattern.md) |
| **tRPC** | ~~End-to-end type safety~~ **DEPRECATED** | [trpc.pattern.md](doc/ard/patterns/trpc.pattern.md) |
| **Git Conventions** | Semantic versioning and commit message format. | [git-conventions.pattern.md](doc/ard/patterns/git-conventions.pattern.md) |
| **Repository Structure** | Organization of context, operations, and infrastructure. | [repository-structure.pattern.md](doc/ard/patterns/repository-structure.pattern.md) |

### REST API Pattern (Standard)

For all server-side API development, **REST API endpoints** are the standard pattern. Use Nuxt's built-in `server/api` routing with authentication wrappers.

- **Endpoints**: Define endpoints in `layers/<layer>/server/api/<layer>/`.
- **Authentication**: Use `withAmplifyAuth()` for protected routes, `withAmplifyPublic()` for public routes.
- **Validation**: Use Zod schemas for input validation.
- **Errors**: Use `createError()` for consistent error responses.

See [api-server.pattern.md](doc/ard/patterns/api-server.pattern.md) for the complete pattern documentation.

> **Note**: tRPC has been **DEPRECATED** in favor of REST API endpoints. See [prd/trpc.md](doc/prd/trpc.md) for historical reference.

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
- Secrets: Create `.env` in `apps/saas/` for Stripe keys (never commit)

### Known Limitations
- **Multi-tenancy**: Not yet implemented. The application currently supports single-user accounts only.
- **Authorization**: RBAC and feature gating (Entitlements) are pending implementation.

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
- `tsx scripts/billing-stripe-sync.ts` — Sync plans to Stripe (uses app.config.ts)
- `pnpm billing:stripe:login` — Authenticate Stripe CLI
- `pnpm billing:stripe:listen` — Local webhook testing

## Development Workflows

### Frontend Feature Implementation
1. **Consult PRD**: Read relevant PRD in `doc/prd/` and review applicable patterns in `doc/ard/patterns/`
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
1. **Configure**: Seed billing plans via JSON in `apps/backend/amplify/seed/data/plans.json`
2. **Sync (Seed)**: `pnpm backend:sandbox:seed:plans` (uses sandbox secret `STRIPE_SECRET_KEY`)
3. **Restart**: Restart dev server if UI caches plan data
4. **Test**: Verify plans load via billing API and match seed JSON

### Bug Fixes
1. **Reproduce**: Under `pnpm saas:dev`
2. **Locate**: Find the smallest layer/app owning the logic
3. **Review**: Check relevant PRD and patterns to understand intended behavior
4. **Fix**: Edit code following applicable patterns
5. **Test**: Verify fix resolves issue without breaking existing functionality
6. **Document**: Update relevant README if behavior changes

## Contribution Standards

### Git Conventions

We follow the **Conventional Commits** pattern. Refer to [git-conventions.pattern.md](doc/ard/patterns/git-conventions.pattern.md) for the full specification and type definitions.

**Project Scopes:**
- `billing`, `auth`, `i18n`, `saas`, `amplify`, `uix`, `workspaces`, `entitlements`, `trpc`, `debug`, `deps`, `docs`

### Code Standards
- **TypeScript**: Strict mode enabled
- **Architecture**: Prefer layers for reusable code, apps for instance-specific
- **UI**: Use Nuxt UI Pro components
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
→ Ensure you ran `pnpm backend:sandbox:seed:plans` and that `STRIPE_SECRET_KEY` is set as a sandbox secret. Plans are defined in `apps/backend/amplify/seed/data/plans.json`.

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
- **Architecture Decisions**: `doc/ard/*.md` - ADRs and cross-cutting concerns
- **Code Patterns**: `doc/ard/patterns/*.md` - Mandatory implementation patterns
- **Compliance Reports**: `doc/analysis/*.md` - Code vs specification validation
- **Implementation Plans**: `doc/plan/*.md` - Layer roadmaps and task breakdowns

### External Documentation & Resources

#### Nuxt Framework
- **Nuxt 4 Documentation**: https://nuxt.com/docs
- **Nuxt UI Components**: https://ui.nuxt.com/components
- **Nuxt UI Pro**: https://ui.nuxt.com/pro (design system & templates)
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
