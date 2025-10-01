## AGENTS.md — AI Agent & Contributor Operational Guide

This document is the single source of truth for working with this repository.

## 🚨 CRITICAL INSTRUCTIONS - READ BEFORE ANY TASK

**ALL agents and contributors MUST consult these instructions before performing any task:**

### Consistency Validation
1. **ALWAYS** validate that any instruction does NOT contradict the instructions, patterns, or architecture documented in this file.
2. **IF CONTRADICTION EXISTS**: Immediately inform the user about the detected inconsistency and the specific sections that would be affected
3. **DO NOT proceed** with contradictory changes without explicit user confirmation

### Conflict Resolution Protocol
- If the user confirms to proceed **despite the contradiction**:
  1. Apply the requested changes
  2. **MANDATORY**: Simultaneously update this document to maintain coherence
  3. Document the changes made in both locations

### Coherence Principle
This document must remain the single source of truth. Any deviation must result in an immediate update of these instructions to prevent future inconsistencies.

## Repository Architecture

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

## Tech Stack

- **Package Manager**: pnpm@10.13.1 (use `corepack enable`)
- **Runtime**: Node.js ≥20.19 (Amplify Console: Node 22 override)
- **Frontend**: Nuxt 4.x + TypeScript
- **Backend**: AWS Amplify Gen2 (Cognito, DynamoDB, AppSync)
- **Billing**: Stripe (portal-first approach)
- **UI**: Nuxt UI Pro + TailwindCSS

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
1. **Configure**: Edit billing plans in `apps/saas/app/app.config.ts`
2. **Sync**: Run `tsx scripts/billing-stripe-sync.ts` (uses test keys)
3. **Restart**: Restart dev server to pick up config changes
4. **Test**: Verify plans appear in UI

### Bug Fixes
1. **Reproduce**: Under `pnpm saas:dev`
2. **Locate**: Find the smallest layer/app owning the logic
3. **Fix**: Edit code
4. **Document**: Update relevant README if behavior changes

## Security & Guardrails

### ⚠️ HIGH RISK OPERATIONS
- `pnpm backend:sandbox:init` → **Deploys AWS resources, incurs costs**
- `tsx scripts/billing-stripe-sync.ts` → **Creates products/prices in Stripe**
- Schema changes in `apps/backend/amplify/data/resource.ts` → **May affect data**

### 🔒 Security Rules
- **Never commit secrets** to version control
- **Use test Stripe keys** for development (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`)
- **Dev AWS account only** for sandbox operations
- **Clean up resources** with `pnpm backend:sandbox:delete` when done

### 💰 Cost Management
- Sandbox creates: Cognito User Pool, DynamoDB tables, AppSync API
- Clean up with `pnpm backend:sandbox:delete`
- Monitor AWS costs in development account

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
→ Check `apps/saas/app/app.config.ts` has billing.plans configured

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

# Frontend
pnpm saas:dev
```

**Success criteria**:
- Visit `http://localhost:3000` → see login/signup
- Can register and login
- `/debug` page shows diagnostics
- Billing plans visible in UI

## References

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
- **Amplify Auth**: https://docs.amplify.aws/react/build-a-backend/auth/
- **Amplify Data (GraphQL)**: https://docs.amplify.aws/react/build-a-backend/data/
- **Amplify Storage**: https://docs.amplify.aws/react/build-a-backend/storage/

#### Stripe Integration
- **Stripe API Documentation**: https://docs.stripe.com/api
- **Stripe Customer Portal**: https://docs.stripe.com/billing/subscriptions/integrating-customer-portal
- **Stripe Webhooks**: https://docs.stripe.com/webhooks

#### Testing
- **Playwright Documentation**: https://playwright.dev/docs/intro
- **Playwright API**: https://playwright.dev/docs/api/class-playwright

#### TypeScript & Tooling
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Zod Validation**: https://zod.dev/
- **TailwindCSS**: https://tailwindcss.com/docs

---

**Note**: No test runner or linter is currently configured. This document will be updated when testing infrastructure is added.
