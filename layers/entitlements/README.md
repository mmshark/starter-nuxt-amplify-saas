# Entitlements Layer

The Entitlements Layer provides authorization and feature access control for the application. It manages role-based access control (RBAC), feature entitlements based on subscription plans, and permission validation.

## Features

- **Plan-Based Entitlements**: Control feature access based on subscription tier (free/pro/enterprise)
- **Role-Based Permissions**: Control actions based on user roles (user/admin/owner)
- **Universal API**: Consistent permission checking on client and server
- **Components**: `<FeatureGate>`, `<PermissionGuard>`, `<UpgradePrompt>`
- **Middleware**: Route protection via `permission`, `feature`, and `requirePlan` middleware

## Usage

### Composable

```typescript
const { canAccessFeature, hasPermission } = useEntitlements()

if (canAccessFeature('advanced-analytics')) {
  // Show analytics
}
```

### Components

```vue
<FeatureGate feature="advanced-analytics">
  <AnalyticsDashboard />
  <template #fallback>
    <UpgradePrompt required-plan="pro" />
  </template>
</FeatureGate>
```

### Middleware

```typescript
definePageMeta({
  middleware: ['auth', 'permission'],
  permission: 'manage-users'
})
```
