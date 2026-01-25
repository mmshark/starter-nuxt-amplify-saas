# Using Published Layers

This guide explains how to use the published Nuxt layers from this repository in your own projects.

## Prerequisites

- Node.js ≥20.19
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

The easiest way to get started is using the SaaS meta-layer, which includes all foundation and feature layers:

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
  ],

  // Optional: Override or extend configurations
  app: {
    name: 'My Custom SaaS App'
  }
})
```

### Option 2: Composing Individual Layers

For more control, compose specific layers:

```typescript
export default defineNuxtConfig({
  extends: [
    // Foundation layers (required)
    '@mmshark/amplify-layer',
    '@mmshark/uix-layer',
    '@mmshark/i18n-layer',

    // Feature layers (pick what you need)
    '@mmshark/auth-layer',
    '@mmshark/billing-layer',
    '@mmshark/workspaces-layer',
    '@mmshark/entitlements-layer',
  ],

  // Your app configuration
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

### Foundation Layers

| Layer | Package | Description | Peer Dependencies |
|-------|---------|-------------|-------------------|
| **amplify** | `@mmshark/amplify-layer` | AWS Amplify Gen2 integration with GraphQL client and storage | `@aws-amplify/auth`, `@aws-amplify/api`, `@aws-amplify/storage` |
| **uix** | `@mmshark/uix-layer` | UI foundation with Nuxt UI Pro, design system, and theming | `@nuxt/ui-pro`, `tailwindcss` |
| **i18n** | `@mmshark/i18n-layer` | Internationalization with multi-language support | `@nuxtjs/i18n` |

### Feature Layers

| Layer | Package | Description | Dependencies |
|-------|---------|-------------|--------------|
| **auth** | `@mmshark/auth-layer` | Authentication with AWS Cognito, session management, route protection | amplify-layer |
| **billing** | `@mmshark/billing-layer` | Stripe billing integration with subscriptions and webhooks | amplify-layer, auth-layer, `stripe` |
| **workspaces** | `@mmshark/workspaces-layer` | Multi-tenant workspace management with team collaboration | amplify-layer, auth-layer |
| **entitlements** | `@mmshark/entitlements-layer` | Authorization and RBAC with role-based access control | amplify-layer, auth-layer |

### Meta-Layer

| Layer | Package | Description | Dependencies |
|-------|---------|-------------|--------------|
| **saas** | `@mmshark/saas-layer` | Complete SaaS application shell with dashboard, navigation, and pre-built pages | All foundation and feature layers |

### Development Layers

| Layer | Package | Description | Dependencies |
|-------|---------|-------------|--------------|
| **debug** | `@mmshark/debug-layer` | Development debugging tools and utilities | None |

## Layer Dependencies

```
saas (meta-layer)
  ├─ amplify (foundation)
  ├─ uix (foundation)
  ├─ i18n (foundation)
  ├─ auth (feature)
  ├─ billing (feature)
  ├─ workspaces (feature)
  └─ entitlements (feature)

billing
  ├─ amplify
  └─ auth

workspaces
  ├─ amplify
  └─ auth

entitlements
  ├─ amplify
  └─ auth

auth
  └─ amplify
```

## Usage Examples

### Example 1: Complete SaaS Application

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@mmshark/saas-layer'],

  // Customize via app.config.ts
})
```

```typescript
// app.config.ts
export default defineAppConfig({
  app: {
    name: 'My SaaS Platform',
    description: 'Custom SaaS application'
  },

  navigation: {
    // Override navigation items
    menuItems: [
      // Your custom menu items
    ]
  }
})
```

### Example 2: Authentication Only

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@mmshark/amplify-layer',
    '@mmshark/uix-layer',
    '@mmshark/auth-layer',
  ],

  // AWS Amplify configuration
  runtimeConfig: {
    public: {
      aws: {
        region: process.env.AWS_REGION,
        userPoolId: process.env.AWS_USER_POOL_ID,
        userPoolClientId: process.env.AWS_USER_POOL_CLIENT_ID,
      }
    }
  }
})
```

### Example 3: Multi-Tenant with Billing

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@mmshark/amplify-layer',
    '@mmshark/uix-layer',
    '@mmshark/i18n-layer',
    '@mmshark/auth-layer',
    '@mmshark/billing-layer',
    '@mmshark/workspaces-layer',
  ],

  runtimeConfig: {
    public: {
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      }
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY
    }
  }
})
```

## Customization

### Overriding Components

All layer components can be overridden by creating files with the same path in your project:

```
your-project/
├── components/
│   └── auth/
│       └── LoginForm.vue  # Overrides @mmshark/auth-layer LoginForm
├── pages/
│   └── dashboard.vue       # Overrides saas-layer dashboard
└── layouts/
    └── default.vue         # Overrides default layout
```

### Extending Configurations

Use `app.config.ts` to customize layer configurations without modifying layer code:

```typescript
// app.config.ts
export default defineAppConfig({
  // Override UI theme
  ui: {
    primary: 'blue',
    gray: 'slate'
  },

  // Override navigation
  navigation: {
    menuItems: [
      { label: 'Home', to: '/', icon: 'i-heroicons-home' },
      { label: 'Dashboard', to: '/dashboard', icon: 'i-heroicons-chart-bar' },
    ]
  },

  // Override auth settings
  auth: {
    redirectAfterLogin: '/custom-dashboard',
    requireEmailVerification: true
  }
})
```

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
1. Verify the layer has been published (check GitHub Packages)
2. Ensure `@mmshark:registry=https://npm.pkg.github.com` is in `~/.npmrc`
3. Check you have access to the private repository

### Version Conflicts

**Problem**: Peer dependency conflicts between layers

**Solution**:
1. Use the SaaS meta-layer which includes compatible versions
2. Check `peerDependencies` in layer `package.json` files
3. Install missing peer dependencies:

```bash
pnpm install @aws-amplify/auth @aws-amplify/api @aws-amplify/storage
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

      - uses: pnpm/action-setup@v2
        with:
          version: 10.13.1

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@mmshark'

      - name: Install dependencies
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: pnpm install

      - name: Build
        run: pnpm build
```

### Environment Variables

Required environment variables for different layers:

**Amplify Layer**:
```bash
AWS_REGION=us-east-1
AWS_USER_POOL_ID=us-east-1_xxxxx
AWS_USER_POOL_CLIENT_ID=xxxxx
AWS_APPSYNC_API_URL=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
```

**Billing Layer**:
```bash
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## Getting Help

- **Documentation**: [Repository Docs](https://github.com/mmshark/starter-nuxt-amplify-saas/tree/master/doc)
- **Issues**: [GitHub Issues](https://github.com/mmshark/starter-nuxt-amplify-saas/issues)
- **PRDs**: [Product Requirements](https://github.com/mmshark/starter-nuxt-amplify-saas/tree/master/doc/prd)
- **ADRs**: [Architecture Decisions](https://github.com/mmshark/starter-nuxt-amplify-saas/tree/master/doc/adr)

## Version Compatibility

| Layer Version | Nuxt Version | Node Version |
|--------------|--------------|--------------|
| 1.x.x | ^4.0.0 | ≥20.19 |

## License

MIT License - See repository for details
