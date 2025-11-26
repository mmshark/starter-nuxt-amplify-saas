# Entitlements Layer

Authorization and feature access control layer for Nuxt 4-based SaaS application. Provides role-based access control (RBAC), feature entitlements based on subscription plans, and permission validation across client and server contexts.

## Features

- 🔐 **Role-Based Access Control (RBAC)**: User/Admin/Owner role hierarchy with permission inheritance
- 🎯 **Plan-Based Entitlements**: Feature access controlled by subscription tier (Free/Pro/Enterprise)
- 🛡️ **Universal API**: Works seamlessly in client, SSR, and API route contexts
- 🚀 **Performance**: Permission caching and reactive state management
- 🧩 **Integration**: Seamless integration with Auth and Billing layers
- 🎨 **UI Components**: Ready-to-use components for feature gates and upgrade prompts

## Installation

This layer is part of the Nuxt Layers architecture and is automatically available when included in the main application.

## Architecture

### Authorization Models

1. **Plan-Based Entitlements**: Features controlled by subscription tier
   - Free → Basic Dashboard
   - Pro → Advanced Analytics, Audit Logs, Data Export, Webhooks
   - Enterprise → API Access, SSO, Custom Branding, Priority Support

2. **Role-Based Permissions**: Actions controlled by user roles
   - User → View dashboard, manage profile, view billing
   - Admin → Manage users, configure settings
   - Owner → Manage billing, export data

3. **Feature Flags**: Gradual feature rollout (planned future enhancement)

### Integration Points

- **Auth Layer**: User authentication via `useUser()`
- **Billing Layer**: Subscription status (to be integrated with Workspaces)
- **Workspaces Layer**: Team roles and workspace subscriptions (planned)

## Usage

### Composable API

```typescript
const {
  // State
  subscriptionPlan,      // Current subscription plan
  userRole,              // Current user role
  availableFeatures,     // Features in current plan
  grantedPermissions,    // Permissions for current role
  isAuthenticated,       // Authentication status

  // Methods
  canAccessFeature,      // Check feature access
  hasPermission,         // Check permission
  hasRole,               // Check role hierarchy
  hasPlan,               // Check plan hierarchy
  getRequiredPlanForFeature, // Get min plan for feature
} = useEntitlements()
```

### Components

#### FeatureGate

Conditional rendering based on feature entitlements:

```vue
<template>
  <FeatureGate feature="advanced-analytics">
    <!-- Content shown only if user can access advanced-analytics -->
    <AdvancedAnalyticsDashboard />

    <!-- Optional fallback -->
    <template #fallback>
      <UpgradePrompt required-plan="pro" />
    </template>
  </FeatureGate>
</template>
```

#### UpgradePrompt

Display upgrade prompt when feature is locked:

```vue
<template>
  <UpgradePrompt
    feature="api-access"
    required-plan="enterprise"
    title="API Access Required"
    description="Unlock programmatic access to your data"
  />
</template>
```

#### PermissionGuard

Guard component for permission-based rendering:

```vue
<template>
  <PermissionGuard permission="manage-users">
    <!-- Admin controls shown only if user has permission -->
    <UserManagementPanel />

    <template #fallback>
      <p>You don't have permission to manage users.</p>
    </template>
  </PermissionGuard>
</template>
```

### Route Middlewares

#### Permission Middleware

Protect routes based on permissions:

```typescript
// pages/admin/users.vue
definePageMeta({
  middleware: ['auth', 'permission'],
  permission: 'manage-users'
})
```

#### Feature Middleware

Protect routes based on feature entitlements:

```typescript
// pages/analytics.vue
definePageMeta({
  middleware: ['auth', 'feature'],
  feature: 'advanced-analytics'
})
```

#### RequirePlan Middleware

Require specific subscription plan:

```typescript
// pages/api-docs.vue
definePageMeta({
  middleware: ['auth', 'requirePlan'],
  requiredPlan: 'enterprise'
})
```

### Server-Side Usage

#### Direct Validation

```typescript
// server/api/admin/users.get.ts
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'manage-users')

  // Permission granted - fetch users
  return await fetchUsers()
})
```

#### HOF Wrapper

```typescript
// server/api/analytics/report.get.ts
export default withFeature(
  async (event) => {
    // Feature access granted - generate report
    return await generateAnalyticsReport()
  },
  'advanced-analytics'
)
```

## Current Status

### ✅ Implemented

- Complete type system (Plan, Role, Feature, Permission)
- Feature and permission configuration
- `useEntitlements()` composable with full API
- UI components (FeatureGate, UpgradePrompt, PermissionGuard)
- Route middlewares (permission, feature, requirePlan)
- Server utilities (requirePermission, requireFeature, requirePlan, withPermission, withFeature)
- Server API endpoints (/api/entitlements/*)

### ⚠️ Temporary Implementation

Currently using default values for workspace-level data:
- **Subscription Plan**: Defaults to 'free' (should come from WorkspaceSubscription)
- **User Role**: Defaults to 'user' (should come from WorkspaceMember)

### 🔄 Pending Integration

Once Workspaces layer is implemented:
1. Update `useEntitlements()` to use `useWorkspaces()` composable
2. Update server utilities to query workspace subscriptions
3. Implement workspace role resolution
4. Add E2E tests for full integration

## Testing

### Unit Tests

Test permission and feature resolution logic:

```bash
npm test -- layers/entitlements/tests/unit
```

### E2E Tests

Test user flows and middleware protection:

```bash
npm test:e2e -- layers/entitlements/tests/e2e
```

## Migration Path

When Workspaces layer is implemented, update these files:

1. **composables/useEntitlements.ts**:
   - Line 17-30: Replace with workspace subscription lookup
   - Line 37-48: Replace with workspace role lookup

2. **server/utils/requirePermission.ts**:
   - Line 21: Get role from workspace membership

3. **server/utils/requireFeature.ts**:
   - Line 28: Get plan from workspace subscription

4. **server/utils/requirePlan.ts**:
   - Line 27: Get plan from workspace subscription

5. **server/api/entitlements/*.get.ts**:
   - Update all endpoints to use workspace data

## API Reference

### Types

- `Plan`: 'free' | 'pro' | 'enterprise'
- `Role`: 'user' | 'admin' | 'owner'
- `Feature`: See [config/features.ts](config/features.ts)
- `Permission`: See [config/permissions.ts](config/permissions.ts)

### Configuration

- **Features**: [config/features.ts](config/features.ts)
- **Permissions**: [config/permissions.ts](config/permissions.ts)

### API Endpoints

- `GET /api/entitlements` - Get user entitlements
- `GET /api/entitlements/check-feature?feature=X` - Check feature access
- `GET /api/entitlements/check-permission?permission=X` - Check permission
- `GET /api/entitlements/features` - List features with access status

## Contributing

When adding new features or permissions:

1. Add to type definitions in [types/entitlements.ts](types/entitlements.ts)
2. Add configuration in [config/features.ts](config/features.ts) or [config/permissions.ts](config/permissions.ts)
3. Update PRD documentation
4. Add E2E tests for new entitlements

## License

Private - Part of Starter Nuxt Amplify SaaS
