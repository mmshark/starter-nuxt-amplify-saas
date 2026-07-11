# Using Published Layers

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/guides/using-published-layers.md

This guide explains how to use the published Nuxt layers from this repository in your own projects.

## Current status (read first — audit-verified)

Consuming these layers from GitHub Packages is **not currently viable end-to-end**:

- **The layers have likely never been published.** The publish tooling exists (`.github/workflows/publish-layers.yml`, `.github/workflows/publish-on-tag.yml`, `scripts/publish-layer.sh`, `scripts/publish-all-layers.sh`, `scripts/verify-layers.sh`) and every layer carries `publishConfig` for `npm.pkg.github.com`, but the audit found **zero GitHub Actions runs** on this repository. All layers sit at version `0.1.0`. Before following this guide, verify availability:
  ```bash
  npm view @mmshark/saas-layer --registry=https://npm.pkg.github.com
  ```
- **The amplify layer cannot work as a published package out of the box.** `layers/amplify/plugins/01.amplify.client.ts`, `01.amplify.server.ts`, and `layers/amplify/server/utils/amplify.ts` statically import `../amplify_outputs.json` — a file that is gitignored *and* excluded from the package `files` list (`layers/amplify/package.json`). A consumer would have to place their own `amplify_outputs.json` inside `node_modules/@mmshark/amplify-layer/` after every install. Since every feature layer and the saas meta-layer depends on the amplify layer, this blocks the whole composition until the layer is decoupled from the static import (tracked in [../prd/roadmap.md](../prd/roadmap.md)).

Until both are resolved, the practical way to reuse these layers is to **fork the monorepo** (see [make-it-yours.md](make-it-yours.md)). The rest of this guide documents the intended published-consumption workflow.

## Prerequisites

- Node.js ≥20.19 (Node 22 recommended — repo tooling and CI use it)
- pnpm ≥10.13.1 (or npm/yarn)
- GitHub account with access to the private packages
- GitHub Personal Access Token (PAT) with `read:packages` scope

## Authentication Setup

### 1. Generate GitHub Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Select scopes:
   - ✅ `read:packages` - Download packages from GitHub Package Registry
4. Generate token and copy it (you won't be able to see it again)

### 2. Configure npm Authentication

Create or edit `~/.npmrc` in your home directory:

```bash
echo "@mmshark:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

Replace `YOUR_GITHUB_TOKEN` with your actual token.

**Alternative: Using environment variable**

```bash
export GITHUB_TOKEN=your_github_token_here
```

Then in `.npmrc`:
```
@mmshark:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Installation

### Basic Installation

Install the layers you need in your Nuxt project:

```bash
# Install foundation layers
pnpm add -D @mmshark/amplify-layer
pnpm add -D @mmshark/uix-layer
pnpm add -D @mmshark/i18n-layer

# Install feature layers
pnpm add -D @mmshark/auth-layer
pnpm add -D @mmshark/billing-layer
pnpm add -D @mmshark/workspaces-layer
pnpm add -D @mmshark/entitlements-layer

# Install complete SaaS shell (includes all dependencies)
pnpm add -D @mmshark/saas-layer
```

### Quick Start with SaaS Layer

The easiest way to get started is using the SaaS meta-layer, which extends all foundation and feature layers:

```bash
pnpm add -D @mmshark/saas-layer
```

## Configuration

### Option 1: Using SaaS Meta-Layer (Recommended)

In your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    '@mmshark/saas-layer'
  ]
})
```

Branding/navigation is configured via `app.config.ts` under the `saas` namespace (see [Usage Examples](#usage-examples)), not via `nuxt.config.ts`.

### Option 2: Composing Individual Layers

For more control, compose specific layers:

```typescript
export default defineNuxtConfig({
  extends: [
    // Foundation layers (required)
    '@mmshark/amplify-layer',
    '@mmshark/uix-layer',
    '@mmshark/i18n-layer',

    // Feature layers (pick what you need — mind the peer dependencies below)
    '@mmshark/auth-layer',
    '@mmshark/billing-layer',
    '@mmshark/workspaces-layer',
    '@mmshark/entitlements-layer',
  ],
})
```

### Option 3: Minimal Setup

Start with just the basics:

```typescript
export default defineNuxtConfig({
  extends: [
    '@mmshark/amplify-layer',  // AWS backend
    '@mmshark/uix-layer',       // UI components
    '@mmshark/auth-layer',      // Authentication
  ]
})
```

## Available Layers

Descriptions below reflect what the code actually does today (audit-verified), not aspirations.

### Foundation Layers

| Layer | Package | Description | Peer Dependencies |
|-------|---------|-------------|-------------------|
| **amplify** | `@mmshark/amplify-layer` | AWS Amplify Gen2 integration: Auth/GraphQL client plugins and server utils. A `$Amplify.Storage` API surface is exposed, but **no storage backend resource exists** — storage calls fail at runtime | `aws-amplify` ^6, `@aws-amplify/core` ^6, `@aws-amplify/auth` ^6, `@aws-amplify/api` ^6, `@aws-amplify/storage` ^6 |
| **uix** | `@mmshark/uix-layer` | UI foundation on **@nuxt/ui v4 (MIT — not Nuxt UI Pro)**: registers the module and defines Tailwind v4 `@theme` tokens. No components/composables of its own | `@nuxt/ui` ^4.9.0, `tailwindcss` ^4 (requires `nuxt` ^4.4.0) |
| **i18n** | `@mmshark/i18n-layer` | Registers `@nuxtjs/i18n` (en/es, lazy loading, number/date formats). **Infrastructure only**: no UI string in the repo is translated yet and there is no locale switcher | `@nuxtjs/i18n` ^10 |

### Feature Layers

| Layer | Package | Description | Layer Peer Dependencies |
|-------|---------|-------------|--------------|
| **auth** | `@mmshark/auth-layer` | Email+password authentication on AWS Cognito (`useUser()`, `Authenticator.vue`, route middleware). No MFA/social login | amplify-layer |
| **billing** | `@mmshark/billing-layer` | Stripe billing: server-side checkout/portal routes, subscription/invoices API, `useBilling()`. Webhook handling lives in the backend Lambda, not this layer | amplify-layer, auth-layer, entitlements-layer, `stripe` ^18 |
| **workspaces** | `@mmshark/workspaces-layer` | Multi-tenant workspace management (CRUD, members, invitations API). Invitation *emails* are not sent — the flow is not usable end-to-end in product | amplify-layer, auth-layer, billing-layer |
| **entitlements** | `@mmshark/entitlements-layer` | Plan/role gating primitives (`useEntitlements()`, `FeatureGate.vue`, middlewares, server-side `requirePermission`). Server enforcement is used by billing; the UI gating components currently have no consumers in the reference app | amplify-layer, auth-layer, workspaces-layer, `zod` ^4 |

### Meta-Layer

| Layer | Package | Description | Dependencies |
|-------|---------|-------------|--------------|
| **saas** | `@mmshark/saas-layer` | SaaS application shell: dashboard/auth layouts, navigation config, auth/profile/settings pages | All foundation and feature layers |

### Development Layers

| Layer | Package | Description | Dependencies |
|-------|---------|-------------|--------------|
| **debug** | `@mmshark/debug-layer` | Dev-only debug pages (`/debug`, `/debug/plans`, `/debug/profile`); each returns 404 outside `import.meta.dev` | auth-layer, billing-layer |

## Layer Dependencies

Two distinct graphs matter. **`extends` (Nuxt layer composition)** — what each layer's `nuxt.config.ts` pulls in:

```
saas (meta-layer)
  ├─ amplify   ├─ uix   ├─ i18n
  ├─ auth      ├─ billing
  ├─ workspaces└─ entitlements

auth        → uix
billing     → uix, i18n
workspaces  → auth, entitlements, uix
entitlements→ (none)
debug       → auth, billing
```

**`peerDependencies` (install-time)** — see the tables above. Note these are *not* the same as `extends`: e.g. `billing` peer-depends on `entitlements-layer` (its server routes import `requirePermission`), and `billing`/`workspaces`/`entitlements` peer-reference each other in a cycle, so in practice the feature layers install together. The amplify layer's plugins are only pulled in by the top-level app composition — auth/billing/etc. are not self-sufficient without an app (or the saas meta-layer) extending `@mmshark/amplify-layer`.

## Usage Examples

### Example 1: Complete SaaS Application

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@mmshark/saas-layer'],
})
```

```typescript
// app.config.ts — the real config namespace is `saas` (see layers/saas/app.config.ts)
export default defineAppConfig({
  saas: {
    brand: {
      name: 'My SaaS Platform',
      logo: '/logo.svg',
      description: 'Custom SaaS application',
      favicon: '/favicon.ico'
    },
    navigation: {
      sidebar: { main: [/* your groups */], footer: [] },
      header: [],
      userMenu: []
    }
  }
})
```

See `apps/saas/app/app.config.ts` for the working example, including composition of
`settingsSidebar` and `userMenuItems` from `@mmshark/saas-layer/config/navigation`.

### Example 2: Authentication Only

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@mmshark/amplify-layer',
    '@mmshark/uix-layer',
    '@mmshark/auth-layer',
  ],
})
```

The amplify layer does **not** read AWS settings from `runtimeConfig` or environment variables — it statically imports `amplify_outputs.json` from inside the layer directory (see [Current status](#current-status-read-first--audit-verified)). Generate that file from your own Amplify Gen2 backend (`ampx generate outputs`).

### Example 3: Multi-Tenant with Billing

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@mmshark/amplify-layer',
    '@mmshark/uix-layer',
    '@mmshark/i18n-layer',
    '@mmshark/auth-layer',
    '@mmshark/entitlements-layer', // required: billing's routes use requirePermission
    '@mmshark/billing-layer',
    '@mmshark/workspaces-layer',
  ],
})
```

The billing layer already wires its own `runtimeConfig` from environment variables (`layers/billing/nuxt.config.ts`) — set env vars instead of redefining `runtimeConfig`:

```bash
STRIPE_SECRET_KEY=sk_test_...       # server-side checkout/portal/invoices routes
APP_BASE_URL=https://app.example.com # Stripe redirect URLs (deliberately not derived from request headers)
STRIPE_PUBLISHABLE_KEY=pk_test_...   # exposed as runtimeConfig.public.stripe.publishableKey (currently unused by layer code)
```

Stripe *webhooks* are handled by a backend Lambda Function URL in this architecture, not by the billing layer — you need the corresponding Amplify backend (see [environments.md](environments.md)).

## Customization

### Overriding Components and Pages

Standard Nuxt layer semantics: a file at the same relative path in your app overrides the layer's copy. Real examples from this repo:

```
your-project/
├── app/
│   ├── components/
│   │   └── UserMenu.vue     # overrides layers/saas/components/UserMenu.vue
│   └── pages/
│       └── index.vue        # overrides layers/saas/pages/index.vue (dashboard home)
```

(The auth layer's components are `Authenticator.vue`, `UserAccountForm.vue`, `UserProfileSettings.vue` — there is no `LoginForm.vue`.)

### Extending Configurations

Use `app.config.ts` to customize without modifying layer code. Keys that are actually consumed today:

```typescript
// app.config.ts
export default defineAppConfig({
  // Nuxt UI v4 theme (framework-level, works with any @nuxt/ui app)
  ui: {
    colors: { primary: 'blue', neutral: 'slate' }
  },

  // SaaS layer config (see layers/saas/app.config.ts + types/saas-config.ts)
  saas: {
    brand: { name: 'Acme', logo: '/logo.svg', description: '...', favicon: '/favicon.ico' },
    navigation: { sidebar: { main: [], footer: [] }, header: [], userMenu: [] },
    features: { workspaceSwitcher: true, darkMode: true },
    layouts: {
      dashboard: { sidebarCollapsible: true, sidebarDefaultCollapsed: false },
      auth: { showBranding: true, showFooter: true }
    }
  }
})
```

**Not consumed (do not rely on them):** `saas.features.multiWorkspace` and `saas.features.onboarding` have no readers in code; `saas.theme.colors` is declared in the layer defaults but nothing maps it to Nuxt UI; the auth layer has **no** app.config-driven settings (keys like `auth.redirectAfterLogin` / `auth.requireEmailVerification` found in older docs do not exist).

## Updating Layers

Check for updates and install new versions:

```bash
# Check for updates
pnpm outdated "@mmshark/*"

# Update all layers
pnpm update "@mmshark/*"

# Update specific layer
pnpm update @mmshark/auth-layer
```

## Troubleshooting

### Authentication Issues

**Problem**: `401 Unauthorized` when installing packages

**Solution**:
1. Verify your GitHub token has `read:packages` scope
2. Check `~/.npmrc` is correctly configured
3. Ensure you have access to the `mmshark/starter-nuxt-amplify-saas` repository

```bash
# Test authentication
npm whoami --registry=https://npm.pkg.github.com
```

### Layer Not Found

**Problem**: `404 Not Found - GET https://npm.pkg.github.com/@mmshark/layer-name`

**Solution**:
1. Verify the layer has been published (check GitHub Packages — see [Current status](#current-status-read-first--audit-verified): the layers may never have been published)
2. Ensure `@mmshark:registry=https://npm.pkg.github.com` is in `~/.npmrc`
3. Check you have access to the private repository

### Build Fails with `Cannot find module '../amplify_outputs.json'`

Expected — the amplify layer statically imports a file that is not shipped in the package. See [Current status](#current-status-read-first--audit-verified). You must generate `amplify_outputs.json` from your Amplify backend and place it where the layer resolves it.

### Version Conflicts

**Problem**: Peer dependency conflicts between layers

**Solution**:
1. Use the SaaS meta-layer, which composes compatible versions
2. Check `peerDependencies` in layer `package.json` files
3. Install missing peer dependencies, e.g.:

```bash
pnpm add aws-amplify @aws-amplify/core @aws-amplify/auth @aws-amplify/api @aws-amplify/storage
```

### Build Errors

**Problem**: Build fails with module resolution errors

**Solution**:
1. Clear node_modules and reinstall:
```bash
rm -rf node_modules .nuxt pnpm-lock.yaml
pnpm install
```

2. Verify layer order in `nuxt.config.ts` (foundation layers first, then feature layers)

### Type Errors

**Problem**: TypeScript errors for layer components/composables

**Solution**:
1. Run Nuxt dev to generate types:
```bash
pnpm dev
```

2. Restart TypeScript server in your IDE

3. Check `.nuxt/tsconfig.json` includes layer types

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.13.1

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@mmshark'

      - name: Install dependencies
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: pnpm install

      - name: Build
        run: pnpm build
```

Note: a build of any app composing the amplify layer also needs `amplify_outputs.json` generated in CI (this repo's own CI does not yet solve this — see the `green-ci` epic in [../prd/roadmap.md](../prd/roadmap.md)).

### Environment Variables

What layers actually read (audit-verified):

**Amplify layer** — no environment variables. Configuration comes from `amplify_outputs.json`, statically imported inside the layer (see [Current status](#current-status-read-first--audit-verified)). Older docs listing `AWS_REGION`/`AWS_USER_POOL_ID`/`AWS_USER_POOL_CLIENT_ID` env vars were wrong — those are never read.

**Billing layer** (`layers/billing/nuxt.config.ts`):
```bash
STRIPE_SECRET_KEY=sk_live_xxxxx       # required for checkout/portal/subscription/invoices routes
APP_BASE_URL=https://app.example.com  # required in production for Stripe redirect URLs
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx  # wired into runtimeConfig.public but currently unused by code
```
`STRIPE_WEBHOOK_SECRET` is an Amplify **backend** secret consumed by the stripe-webhook Lambda, not a Nuxt env var.

## Getting Help

- **Documentation**: this `.context/` tree — [PRDs](../prd/), [patterns](../patterns/) (see [patterns/layers.md](../patterns/layers.md) for the layer architecture), [architecture overview](../architecture/overview.md)
- **Issues**: [GitHub Issues](https://github.com/mmshark/starter-nuxt-amplify-saas/issues)
- **Forking instead of consuming packages**: [make-it-yours.md](make-it-yours.md)

## Version Compatibility

| Layer Version | Nuxt Version | Node Version |
|--------------|--------------|--------------|
| 0.1.0 (all layers; unpublished — see Current status) | ^4.0.0 (uix requires ^4.4.0) | ≥20.19 (22 recommended) |

## License

MIT License — see [`LICENSE`](../../LICENSE) at the repository root.
