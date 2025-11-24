# PRD: Nuxt Amplify SaaS Starter

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
- [3. Technical Architecture](#3-technical-architecture)
  - [3.1 Workspace-based Monorepo](#31-workspace-based-monorepo)
  - [3.2 Nuxt Layers Architecture](#32-nuxt-layers-architecture)
  - [3.3 AWS Amplify Gen2 Backend Architecture](#33-aws-amplify-gen2-backend-architecture)
  - [3.4 tRPC API Support](#34-trpc-api-support)
  - [3.5 Environment Management](#35-environment-management)
  - [3.6 SaaS Configuration](#36-saas-configuration)
  - [3.7 Deployment Architecture](#37-deployment-architecture)
- [4. Testing](#4-testing)
  - [4.1 Testing Philosophy](#41-testing-philosophy)
  - [4.2 E2E Testing Strategy](#42-e2e-testing-strategy)
- [5. Implementation](#5-implementation)
  - [5.2 Definition of Done](#52-definition-of-done)

## 1. Overview

### 1.1 Purpose

This Nuxt Amplify SaaS Starter offers aproduction-ready SaaS starter kit built with Nuxt 4 and AWS Amplify Gen2. It provides a solid foundation for building scalable SaaS applications with authentication, billing, and multi-tenancy out of the box.

### 1.2 Scope

**Includes**:
- Complete authentication system with AWS Cognito
- Stripe subscription billing with customer portal
- Multi-language internationalization (i18n)
- Professional dashboard UI with Nuxt UI Pro
- AWS backend infrastructure (DynamoDB, AppSync GraphQL)
- Modular layer-based architecture
- Development and debug tooling
- Production deployment configuration


**Excludes**:
- Business related features (inventory management, booking system, etc.)


### 1.3 Key Requirements

**Functional**:
- **Authentication and user management**: Complete auth flow (signup, signin, password reset) with AWS Cognito.
- **Authorization & Entitlements**: Role-based access control and feature entitlements based on **Workspace** subscription plans.
- **Workspaces**: Multi-tenant workspace management where subscriptions and data are scoped to the workspace.
- **Billing & Subscriptions**: Stripe integration with **Workspace-level** subscription management and customer portal.
- **Internationalization**: Multi-language support with auto-formatting for dates/currency.
- **UI Components**: Built with Nuxt UI Pro for consistent, beautiful design.
- **Responsive**: Mobile-first design that works on all devices.
- **Dashboard**: Professional dashboard interface with collapsible sidebar and dark mode.
- **Configurable**: Easy-to-customize navigation, theming, and billing plans.
- **Modular Architecture**: Layer-based system for scalable, maintainable code.
- **AWS Ready**: Full AWS Amplify integration with DynamoDB and GraphQL API.
- **Performance**: Optimized with Nuxt 4's latest performance improvements.


### 1.4 Artifacts

**Applications**:
- **SaaS Dashboard** (`apps/saas/`) - Main application with SSR
- **Landing Page** (`apps/landing/`) - Marketing site with SSG
- **Backend** (`apps/backend/`) - AWS Amplify Gen2 infrastructure

**Reusable Layers**:

*Enabling Layers (Infrastructure & Foundation)*:
- **Amplify Layer** (`layers/amplify/`) - AWS integration utilities
- **UIX Layer** (`layers/uix/`) - UI components and design system
- **I18n Layer** (`layers/i18n/`) - Internationalization support
- **tRPC Layer** (`layers/trpc/`) - Type-safe API layer for custom business logic

*Feature Layers (Business Capabilities)*:
- **Auth Layer** (`layers/auth/`) - Complete authentication system
- **Billing Layer** (`layers/billing/`) - Stripe subscription management
- **Entitlements Layer** (`layers/entitlements/`) - Authorization and feature entitlements
- **Workspaces Layer** (`layers/workspaces/`) - Multi-tenant workspace management
- **Onboarding Layer** (`layers/onboarding/`) - User activation and setup wizard
- **Notifications Layer** (`layers/notifications/`) - Unified communication system



## 2. User Flows

Concrete end-to-end user journeys are defined on the layer-specific PRDs.

## 3. Technical Architecture

### 3.1 Workspace-based Monorepo

The project uses **pnpm workspaces** to manage a monorepo containing multiple applications and reusable layers.

**Structure Philosophy**:
- **apps/**: Deployable applications (backend, saas, landing)
- **layers/**: Reusable Nuxt layers (auth, billing, amplify, uix, i18n)
- **Root**: Workspace configuration and shared tooling

**Dependency Management**:
- **Shared Dependencies**: Installed at workspace root (TypeScript, ESLint, Prettier)
- **Layer Dependencies**: Each layer has own `package.json` with dependencies
- **Hoisting**: pnpm automatically hoists common dependencies to root
- **Isolation**: Each package maintains independent version control

**Benefits**:
- **Single Installation**: `pnpm install` installs all packages
- **Efficient Storage**: Hard-linked node_modules (saves disk space)
- **Fast Builds**: Workspace-aware caching and parallel execution
- **Consistent Versions**: Shared dependencies ensure consistency
- **Simple Scripts**: Workspace scripts coordinate multi-package operations

### 3.2 Nuxt Layers Architecture

Nuxt Layers provide a modular architecture for sharing full-stack code (components, composables, server routes, middleware) across applications.

**Layer Structure Pattern**:
```
layers/layer-name/
├── components/          # Auto-imported Vue components
├── composables/         # Auto-imported composables (useX pattern)
├── middleware/          # Route middleware (auth, guest, etc.)
├── server/
│   ├── api/            # API routes (/api/*)
│   ├── routes/         # Server routes (custom paths)
│   └── utils/          # Server-only utilities
├── utils/              # Universal utilities (client & server)
├── types/              # TypeScript definitions
├── public/             # Static assets
├── nuxt.config.ts      # Layer configuration
├── package.json        # Layer metadata and dependencies
└── README.md           # Layer documentation
```

**Auto-Import Strategy**:

Nuxt automatically imports from all extended layers:

```typescript
// Available everywhere without explicit imports:
useUser()           // from @starter-nuxt-amplify-saas/auth
useBilling()        // from @starter-nuxt-amplify-saas/billing
useGraphQL()        // from @starter-nuxt-amplify-saas/amplify
useTranslation()    // from @starter-nuxt-amplify-saas/i18n

// Components auto-imported:
<Authenticator />   <!-- from auth layer -->
<UCard />           <!-- from uix layer -->
```

**Layer Extensibility Example**:

Creating a custom entitlements layer that extends auth and billing:

```typescript
// layers/entitlements/composables/useEntitlements.ts
export function useEntitlements() {
  const { user } = useUser()        // Auth Layer
  const { subscription } = useBilling()  // Billing Layer

  const canAccessFeature = (feature: string): boolean => {
    if (!user.value) return false

    const plan = subscription.value?.plan || 'free'

    const permissions = {
      free: ['basic-feature'],
      pro: ['basic-feature', 'advanced-analytics'],
      enterprise: ['basic-feature', 'advanced-analytics', 'api-access']
    }

    return permissions[plan]?.includes(feature) || false
  }

  return { canAccessFeature }
}
```

**Benefits of Layer Architecture**:
- **Code Reuse**: Share components, composables, and server logic across apps
- **Modularity**: Each layer has single responsibility
- **Type Safety**: TypeScript works seamlessly across layers
- **SSR Compatible**: Layers work with both client and server rendering
- **Easy Testing**: Test layers independently
- **Scalability**: Add features by creating new layers
- **Maintainability**: Clear separation of concerns

### 3.3 AWS Amplify Gen2 Backend Architecture

AWS Amplify Gen2 provides Infrastructure as Code (IaC) for serverless backend resources with TypeScript definitions and automatic type generation.

**Backend Directory Structure**:
```
apps/backend/
├── amplify/
│   ├── auth/
│   │   └── resource.ts           # Cognito User Pool configuration
│   ├── data/
│   │   ├── resource.ts           # AppSync API + DynamoDB tables
│   │   └── schema.graphql        # GraphQL schema definition
│   ├── storage/
│   │   └── resource.ts           # S3 bucket configuration
│   ├── functions/
│   │   ├── post-confirmation/    # Lambda: Post-confirmation trigger
│   │   ├── stripe-webhook/       # Lambda: Stripe webhook handler
│   │   └── graphql-resolver/     # Lambda: Custom GraphQL resolvers
│   └── backend.ts                # Backend resource composition
├── amplify_outputs.json          # Generated: Amplify configuration
├── package.json
└── tsconfig.json
```

### 3.4 tRPC API Support

The tRPC layer provides end-to-end type-safe APIs for custom business logic that extends beyond basic Amplify GraphQL operations.

**Use Cases**:
- **Complex Business Logic**: Multi-step operations combining Amplify GraphQL + external services (e.g., Stripe checkout creation that updates both Amplify profile and creates Stripe session)
- **Input Validation**: Runtime validation with Zod schemas for complex request parameters (e.g., enums, nested objects, custom validation rules)
- **Third-Party Integrations**: Type-safe wrappers for external APIs (Stripe, SendGrid, analytics services)
- **Data Aggregation**: Operations that combine data from multiple sources (Amplify + Stripe + cache)

**NOT for**:
- ❌ Direct Amplify resource access (use GraphQL directly)
- ❌ External webhooks (must use REST for external services like Stripe webhooks)
- ❌ Simple CRUD operations already handled by Amplify GraphQL

**Architecture Pattern**:
```
Amplify GraphQL → Direct AWS resources (UserProfile, SubscriptionPlan, etc.)
tRPC Procedures → Custom business logic (Stripe integration, aggregations, etc.)
REST Endpoints → External webhooks and public APIs
```

### 3.5 Environment Management

Managing configuration across development, staging, and production environments.

**Environment Variable Patterns**:

**`.env` Files** (Development):
```bash
# apps/saas/.env.local
# AWS Configuration (from Amplify sandbox)
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxx

# Stripe Keys (test mode)
STRIPE_SECRET_KEY=sk_test_xxxxx
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Application Configuration
NUXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Runtime Configuration** (`nuxt.config.ts`):
```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-only secrets (never exposed to client)
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    // Public configuration (exposed to client)
    public: {
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      amplify: {
        region: process.env.AWS_REGION,
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        userPoolClientId: process.env.COGNITO_CLIENT_ID
      }
    }
  }
})
```

### 3.6 SaaS Configuration

Using the app.config.ts file, you can configure the whole SaaS application overlaying the defauls defined in the layers.

**Configurabe theme**

The theme is configurable in the app.config.ts file.

```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    }
  }
})
```

**Configurable Navigation**

The navigation is configurable in the app.config.ts file.

```typescript
export default defineAppConfig({
    navigation: {
      main: [[{ label: 'Dashboard', icon: 'i-lucide-home', to: '/dashboard' }]]
    }
})
```

### 3.7 Deployment Architecture

**Three-App Deployment Strategy**:

1. **Backend** (AWS Amplify Gen2):
   - Infrastructure as Code deployment
   - Creates all AWS resources (Cognito, AppSync, DynamoDB, Lambda)
   - Deployed per branch (sandbox, staging, production)
   - Automatic resource provisioning

2. **SaaS Dashboard** (Nuxt SSR):
   - Server-side rendering for SEO and performance
   - Deployed as Node.js application
   - Runs on AWS App Runner or Amplify Hosting
   - Dynamic content with authenticated routes

3. **Landing Page** (Nuxt SSG):
   - Static site generation for maximum performance
   - Deployed to CloudFront CDN
   - Pre-rendered HTML for marketing pages
   - No server required

**Continuous Deployment Pipeline**:
```
Git Push
  ↓
Amplify Console CI/CD
  ↓
├─→ Backend: Deploy AWS resources (Cognito, AppSync, DynamoDB)
├─→ SaaS: Build SSR → Deploy to App Runner
└─→ Landing: Generate static → Deploy to CloudFront

Automated Tests
  ↓
Health Checks
  ↓
Blue-Green Deployment
  ↓
Production Live
```


## 4. Testing

Comprehensive testing strategy using real AWS services and E2E testing for high confidence in production deployments.

### 4.1 Testing Philosophy

**No Mocks Approach**: Test against real AWS Amplify sandbox environment instead of mocking services.

**Rationale**:
- Real integration testing catches service-specific edge cases
- No mock drift from actual AWS Cognito/AppSync behavior
- Amplify sandbox provides isolated test environment
- Higher confidence in production deployment

**Testing Pyramid**:
```
       /\
      /E2\      E2E Tests (70%): User journeys, integrations
     /____\
    /      \    Integration Tests (20%): Layer interactions
   /________\
  /          \  Unit Tests (10%): Pure utilities only
 /____________\
```

**Why Inverted Pyramid**:
- SaaS app is integration-heavy (auth + billing + data)
- Most bugs occur at integration boundaries
- Real AWS testing is affordable with sandbox
- Unit tests only for business logic (no mocks)

---

### 4.2 E2E Testing Strategy

E2E tests are organized into two complementary categories that provide different levels of test coverage.

**Test Organization**:
```
tests/e2e/
├── specs/
│   ├── flows/               # Cross-layer user journeys
│   │   └── new-user-journey.spec.js
│   └── layers/              # Layer-specific tests
│       ├── auth/            # Auth layer functionality
│       ├── billing/         # Billing layer functionality
│       └── dashboard/       # Dashboard features
├── config/                  # Test configuration
├── fixtures/                # Test data (users, cards)
├── utils/                   # Shared utilities (cache, selectors)
└── helpers/                 # Test utilities (auth, stripe, assertions)
```

---

**Test Categories**:

**1. Layer Tests** (`specs/layers/`):

**Philosophy**: Verify that individual layers work correctly in isolation.

**Characteristics**:
- Test one layer at a time (auth, billing, dashboard)
- Independent execution (tests don't depend on each other)
- Fresh state for each test
- Fast execution (< 30 seconds per test)
- High granularity (specific features within a layer)

**Purpose**:
- Validate layer-specific functionality
- Catch regressions in individual components
- Provide fast feedback during development
- Enable focused debugging of layer issues

**Examples**:
- `auth/signup.spec.js`: User registration and email verification
- `billing/plans.spec.js`: Subscription plan selection and changes
- `dashboard/navigation.spec.js`: Dashboard menu and routing

---

**2. Flow Tests** (`specs/flows/`):

**Philosophy**: Verify complete user journeys that span multiple layers and integrations.

**Characteristics**:
- Cross-layer execution (auth + billing + dashboard + integrations)
- Serial execution (`mode: 'serial'` - steps must run in order)
- Shared state between steps (via `TestCache`)
- Slower execution (2-5 minutes per flow)
- Coarse granularity (entire user workflows)

**Purpose**:
- Validate end-to-end user experiences
- Test layer integration and data synchronization
- Verify real-world usage scenarios
- Ensure complete workflows function together

**Examples**:
- `new-user-journey.spec.js`: Signup → Login → Subscribe → Verify subscription
- `upgrade-plan.spec.js`: Login → View plans → Upgrade → Confirm new features
- `cancel-subscription.spec.js`: Login → Cancel → Verify downgrade


# 5. Implementation

## 5.1. Monorepo Structure

```
starter-nuxt-amplify-saas/
├── apps/
│   ├── backend/         # AWS Amplify Gen2 backend (Auth, API, Database)
│   ├── saas/            # Main SaaS dashboard application (Nuxt 4 SSR)
│   └── landing/         # Marketing landing page (Nuxt 4 SSG)
├── layers/
│   ├── auth/            # Authentication (AWS Cognito + middleware + components)
│   ├── billing/         # Stripe billing integration (subscriptions + webhooks + API)
│   ├── amplify/         # AWS Amplify integration (GraphQL client + storage)
│   ├── uix/             # UI foundation layer (Nuxt UI Pro + Tailwind + design system)
│   ├── i18n/            # Internationalization (multi-language support + formatting)
│   └── <other-layer>/   # ... other reusable layers ...
├── package.json         # Workspace root package
└── pnpm-workspace.yaml  # Workspace root config
```

### 5.2 Definition of Done

**Acceptance Criteria**

- [ ] Authentication layer is implemented
- [ ] Billing layer is implemented
- [ ] Amplify layer is implemented
- [ ] UI layer is implemented
- [ ] Internationalization layer is implemented
- [ ] Other layers are implemented
- [ ] Monorepo structure is implemented
- [ ] Plan is implemented

**Layers**

- [ ] auth: Authentication layer is implemented
- [ ] Billing layer is implemented
- [ ] amplify: Amplify layer is implemented
- [ ] uix: UI layer is implemented
- [ ] i18n: Internationalization layer is implemented


## 5.3. Implementation Plan
See [SaaS Implementation Plan](../plan/saas.md).
