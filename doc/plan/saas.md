# Implementation Plan: SaaS Application

## Phases

### Phase 1: Foundation & Infrastructure
- Monorepo setup with pnpm workspaces
- AWS Amplify Gen2 backend (Cognito + GraphQL + DynamoDB)
- Sandbox environment deployment
- Basic testing infrastructure (Playwright)
- CI/CD pipeline setup

### Phase 2: Core Layers
- **Amplify Layer**: GraphQL client, type generation, storage utilities
- **UIX Layer**: Nuxt UI Pro, Tailwind, theme configuration, design system
- **I18n Layer**: Multi-language support, locale switching, formatters

### Phase 3: Authentication Layer
- `useUser()` composable (SSR-safe state management)
- `<Authenticator>` component with multi-step flow
- Route protection middleware (`auth`, `guest`)
- Server utilities (`requireAuth`, `withAuth`)
- Cognito → GraphQL profile sync
- See [auth.md PRD](../prd/auth.md) for detailed specification

### Phase 4: Billing Layer
- `useBilling()` composable for subscription management
- Stripe Customer Portal integration
- Webhook handling (`/api/billing/webhook`)
- Subscription state sync (Stripe → DynamoDB)
- Pricing table and billing UI components

### Phase 5: Entitlements Layer
- `useEntitlements()` composable for authorization checks
- Role-based access control (RBAC) system
- Feature entitlements based on subscription plans
- Permission middleware and server utilities
- Integration with auth and billing systems

### Phase 6: Workspaces Layer
- `useWorkspaces()` composable for multi-tenant management
- Workspace creation and switching functionality
- Team member management and invitations
- Workspace-scoped data isolation
- Integration with auth and entitlements

### Phase 7: Onboarding Layer
- `useOnboarding()` composable for wizard state
- Configurable flow engine
- Integration with Auth (post-signup) and Workspaces
- UI components (`<OnboardingWizard>`, `<StepIndicator>`)

### Phase 8: Notifications Layer
- `useNotifications()` composable
- Unified `notify()` server utility
- In-App notification center (Bell icon)
- Email template management (AWS SES)
- User preference management

### Phase 9: SaaS Application
- Dashboard application (`apps/saas/`) with SSR
- Page structure (auth, dashboard, settings)
- Responsive navigation and layout
- Integration with all layers

### Phase 10: Landing Page
- Marketing site (`apps/landing/`) with SSG
- SEO optimization and static generation
- CloudFront deployment

### Phase 11: Testing & Quality
- E2E tests (layer tests + flow tests)
- Integration testing across layers
- Quality checks (lint, typecheck, coverage)
- Performance and accessibility audits

### Phase 12: Documentation & Deployment
- Complete documentation (README per layer)
- Production deployment (all apps)
- Monitoring and observability
- Custom domain configuration
