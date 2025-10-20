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

## Patterns

This section outlines standardized patterns for consistency, scalability, and maintainability across the repository. Update this section for any new or modified patterns.

### Layers Patterns

Guidelines for designing and maintaining Nuxt Layers in this monorepo.

**Standard structure (per layer):**

```text
layers/<layer>/
  nuxt.config.ts          # Layer config (runtimeConfig, i18n merge, module opts)
  package.json           # Name: @starter-nuxt-amplify-saas/<layer>
  README.md              # Public API, usage, caveats
  components/            # Reusable UI components (dual-mode: controlled/autonomous)
  composables/           # SSR-safe composables (useState-based; init guards)
  plugins/               # Client/server plugins (prefix with 01., 02. to enforce order)
  server/
    api/<layer>/...      # Namespaced routes to avoid collisions
    utils/               # Server-only helpers (no client globals)
  utils/                 # Shared helpers (isomorphic if needed)
  types/                 # d.ts module augmentation and public types
  i18n/locales/{en,es}/  # Layer-local translations (merged in nuxt.config)
  assets/                # Optional assets (e.g., uix theme tokens)
```

**Key Principles & Guidelines:**
- Encapsulation: Each layer owns its namespace and internal logic.
- Composition: Apps extend multiple layers using the extends field on `nuxt.config.ts` (e.g., `@starter-nuxt-amplify-saas/<layer>`).
- SSR Safety: Use `useState` or shared state and per-request isolation.
- Internal API: Server routes and utilities are namespaced per layer to avoid collisions.
- UI: Prefer Nuxt UI Pro and in-house components in `layers/uix`.
- Server Routes: Always namespaced under `server/api/<layer>/...` to avoid collisions.
- Plugins: Separate client/server plugins (`*.client.ts` / `*.server.ts`).
- Plugins: Use numeric prefixes (e.g., `01.amplify.client.ts`) to ensure ordering when a dependency must load first (e.g., Amplify before auth/billing).
- Internationalization: Each layer may contribute locales; merge them in `nuxt.config` of the layer. Scope keys by feature to avoid collisions.
- Types: Provide `.d.ts` files for module augmentation (e.g., `types/amplify.d.ts`).
- Export public TypeScript types for component props/emits and composable return types.
- Configuration: Layer `nuxt.config.ts` can define `runtimeConfig` (server) and `public.runtimeConfig` (client). Never hardcode secrets.
- Document required environment variables in the layer README (e.g., Stripe keys for `billing`).

#### Package.json Export Patterns in layers

**Simple Layers** (configuration only):

These layers doesn't offer any utility.

```json
{
  "name": "@starter-nuxt-amplify-saas/<layer>",
  "main": "./nuxt.config.ts"
}
```

**Complex Layers** (configuration + utilities):

Layers that exports utilities.

```json
{
  "name": "@starter-nuxt-amplify-saas/<layer>",
  "main": "./nuxt.config.ts",
  "exports": {
    ".": "./nuxt.config.ts",
    "./server/utils/<layer>": "./server/utils/<layer>.ts"
  }
}
```

**Critical Rule**: If `package.json` has **any** `exports` field, you **MUST** explicitly export `"."` pointing to `nuxt.config.ts`. Node.js module resolution works as follows:
- **No exports field**: Uses `main` field (defaults to `nuxt.config.ts`)
- **Has exports field**: Ignores `main` field, requires explicit `"."` export for the default import


### Layer Dependency Management

Guidelines for managing dependencies in Nuxt Layers to ensure proper TypeScript support and runtime behavior.

**Dependency Declaration Rules:**

1. **Runtime Dependencies** (in `dependencies`):
   - All packages imported and used at runtime by the layer
   - Third-party libraries (e.g., `aws-amplify`, `stripe`, `zod`)
   - UI libraries (e.g., `@nuxt/ui`, `@vueuse/core`)
   - Workspace dependencies that the layer directly uses
   - Any package that appears in `import` statements in the layer code

2. **Development Dependencies** (in `devDependencies`):
   - Build tools and TypeScript (e.g., `nuxt`, `typescript`, `eslint`)
   - Type definitions for runtime dependencies (e.g., `@types/jsonwebtoken`)
   - Development-only utilities (e.g., `@aws-amplify/seed`, `tsx`)
   - Linting and formatting tools

**Key Principles & Guidelines:**
- **LSP/TypeScript Support**: Declare runtime dependencies in `dependencies` to ensure proper TypeScript resolution and LSP support in IDEs like Cursor.
- **Layer Isolation**: Each layer should declare its own dependencies, even if they might be available through the consuming app.
- **Workspace Dependencies**: Use `workspace:*` for internal layer dependencies (e.g., `@starter-nuxt-amplify-saas/uix`).
- **Version Consistency**: Keep versions consistent across layers when using the same packages.
- **Avoid Duplication**: Don't redeclare dependencies that are already declared in workspace dependencies.

**Common Patterns:**
```json
{
  "dependencies": {
    "@starter-nuxt-amplify-saas/uix": "workspace:*",
    "aws-amplify": "^6.15.3",
    "@vueuse/core": "^13.9.0",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5",
    "@aws-amplify/seed": "^1.0.0",
    "nuxt": "^4.0.0",
    "typescript": "^5.8.3"
  }
}
```

**Troubleshooting:**
- **"Cannot find module" errors**: Move the package from `devDependencies` to `dependencies`
- **TypeScript errors in IDE**: Ensure runtime dependencies are in `dependencies`, not `devDependencies`
- **Build failures**: Check that all imported packages are declared as dependencies

### Composables Patterns

Guidelines for designing and maintaining Nuxt Composables in this repository.

**Standard Template (per composable):**

```ts
import { createSharedComposable } from '@vueuse/core' // Import if needed for shared instance

// Base state: Use useState for SSR-safe, serializable shared state
const useXState = () => ({
  data: useState<any>('x:data', () => null), // Main data (e.g., fetched resource)
  loading: useState<boolean>('x:loading', () => false), // Global loading flag
  error: useState<string | null>('x:error', () => null) // Error message
  // Optional: Add guards like initialized: useState<boolean>('x:initialized', () => false)
})

// Core logic: Environment-agnostic where possible, branched when needed
const _useX = () => {
  const s = useXState()

  // Shared action: Logic that runs identically on server/client
  const action = async () => {
    s.loading.value = true
    try {
      // Example: Fetch data or perform computation
      // s.data.value = await someUniversalFetch()
    } catch (e: any) {
      s.error.value = e?.message ?? 'Unknown error'
    } finally {
      s.loading.value = false
    }
  }

  // Differentiated action: Branch based on environment
  const actionDifferentiated = async () => {
    s.loading.value = true
    try {
      if (import.meta.server) {
        // Server-only: e.g., access Nitro event, database queries without client exposure
      }
      if (import.meta.client) {
        // Client-only: e.g., browser APIs like localStorage, DOM interactions
      }
    } catch (e: any) {
      s.error.value = e?.message ?? 'Unknown error'
    } finally {
      s.loading.value = false
    }
  }

  return { ...s, action, actionDifferentiated }
}

// Client-shared export: Use createSharedComposable for efficiency on client
export const useX = createSharedComposable(_useX)

// Server-only export: Isolated instance per request (throw error if called on client)
export const useXServer = () => {
  if (import.meta.client) throw new Error('useXServer is server-only')
  return _useX()
}
```

**Key Principles & Guidelines:**
- SSR Safety: Prioritize useState for serializable state to avoid hydration mismatches. Avoid non-serializable values (e.g., functions, classes).
- Environment Differentiation: Use import.meta.server and import.meta.client to branch logic where necessary, keeping the API consistent.
- Shared Instance: Wrap with createSharedComposable to share a single instance across client-side components, reducing redundant computations.
- Server Isolation: Provide a server-only variant (useXServer) for per-request isolation in API routes or server plugins.
- Error Handling: Always include loading and error states; wrap actions in try/catch/finally for robust UX.
- Initialization Guards: For async operations, add initialized or inFlight flags to prevent duplicate fetches (not shown in template but recommended for complex composables).

**Usage Notes:**
- Use `useX` for client-side components, composables and plugins.
- Use `useX` for server-side components, composables.
- Use `useXServer` for server API routes (`server/api/`) or server plugins.

### API Server Patterns

Guidelines for designing and maintaining API Server (`server/api/`) in this repository.

**Key Principles & Guidelines:**
- Auth wrappers come from the `amplify` layer utils when using Amplify resources.
  - `withAmplifyAuth(event, fn)` for authenticated routes.
  - `withAmplifyPublic(fn)` for public routes (no auth, safe reads only).
  - Prefer server clients from `@starter-nuxt-amplify-saas/amplify/server/utils/amplify` (e.g., `getServerUserPoolDataClient`).
- Validate inputs and return normalized `{ success, data?, error? }` shapes. Use `createError` for HTTP errors.
- Keep third-party SDK initialization (e.g., Stripe) inside handlers, reading keys from `runtimeConfig` provided by the layer.

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
1. **Plan**: Determine if feature belongs in a layer (reusable) or app (instance-specific)
2. **Develop**: Use layers for composables/components, `apps/saas/app/` for pages
3. **Protect**: Add `definePageMeta({ middleware: 'auth' })` to protected pages
4. **Configure**: Update `apps/saas/app/app.config.ts` for instance-specific settings
5. **Test**: Run `pnpm saas:dev` and verify functionality

### Backend Schema Changes
1. **Edit**: Modify `apps/backend/amplify/data/resource.ts`
2. **Generate**: `pnpm amplify:sandbox:generate-graphql-client-code`
3. **Verify**: Check generated types compile
4. **Test**: Run app and verify affected flows

### Billing Configuration
1. **Configure**: Seed billing plans via JSON in `apps/backend/amplify/seed/data/plans.json`
2. **Sync (Seed)**: `pnpm backend:sandbox:seed:plans` (uses sandbox secret `STRIPE_SECRET_KEY`)
3. **Restart**: Restart dev server if UI caches plan data
4. **Test**: Verify plans load via billing API and match seed JSON

### Bug Fixes
1. **Reproduce**: Under `pnpm saas:dev`
2. **Locate**: Find the smallest layer/app owning the logic
3. **Fix**: Edit code
4. **Document**: Update relevant README if behavior changes

## Contribution Standards

### Git Conventions
- **Format**: `<type>(<scope>): <description>` (max 72 chars)
- **Types**: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`
- **Scopes**: `billing`, `auth`, `i18n`, `saas`, `amplify`, `uix`, `debug`, `deps`, `docs`

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
