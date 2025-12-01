# Layer Dependency Analysis

## Executive Summary

This document provides a comprehensive analysis of dependencies between Nuxt layers in the starter-nuxt-amplify-saas project. It explains not only WHAT depends on WHAT, but also WHY and FOR WHAT PURPOSE each dependency exists.

## Dependency Hierarchy

```
Infrastructure Layers (No dependencies)
├── amplify - AWS Integration
├── uix - UI Components & Design System
├── i18n - Internationalization
└── debug - Development Tools

Level 1 (Auth Foundation)
└── auth → uix

Level 2 (Business Logic)
├── billing → uix, i18n
└── entitlements → (uses: auth, billing)

Level 3 (Complex Features)
└── workspaces → auth, entitlements, uix
                 (uses: billing)
```

---

## Infrastructure Layers

### 1. Amplify Layer
**Location**: `layers/amplify/`
**Dependencies**: None
**Purpose**: AWS integration utilities

**Provides**:
- `withAmplifyAuth()` - Server authentication context wrapper
- `withAmplifyPublic()` - Server public context wrapper
- `getServerPublicDataClient()` - GraphQL client for server
- `getServerUserPoolDataClient()` - User pool GraphQL client
- Amplify configuration and initialization

**Used By**: All layers that interact with AWS (billing, workspaces, auth)

---

### 2. UIX Layer
**Location**: `layers/uix/`
**Dependencies**: None
**Purpose**: UI components and design system

**Provides**:
- Nuxt UI Pro components (`<UCard>`, `<UButton>`, `<UModal>`, etc.)
- Tailwind CSS configuration
- Design tokens and theming
- Layout components

**Used By**: All layers that have UI components (auth, billing, workspaces, entitlements)

---

### 3. I18n Layer
**Location**: `layers/i18n/`
**Dependencies**: None
**Purpose**: Internationalization and localization

**Provides**:
- `useTranslation()` composable
- Multi-language support
- Date/currency formatting
- Translation files

**Used By**: billing (for currency/date formatting)

---

### 4. Debug Layer
**Location**: `layers/debug/`
**Dependencies**: None
**Purpose**: Development and debugging tools

**Provides**:
- Debug dashboard (`/debug`)
- System information display
- Composable status checking

**Used By**: Development environment only

---

## Level 1: Auth Foundation

### 5. Auth Layer
**Location**: `layers/auth/`

#### Dependencies
- **uix** (extends)
  - **Why**: Needs UI components for authentication forms
  - **What**: Uses `<UCard>`, `<UButton>`, `<UInput>` for login/signup forms

- **amplify** (runtime)
  - **Why**: Uses AWS Amplify library operations within the configured context
  - **What**: Imports `aws-amplify/auth/server` (operations) to run inside `withAmplifyAuth` (context)
  - **Note**: The `amplify` layer provides the *context*, while `aws-amplify` provides the *operations*.

#### Provides
**Composables**:
- `useUser()` - User authentication state and methods
  ```typescript
  const { user, userAttributes, isAuthenticated, signOut } = useUser()
  ```

**Server Utilities**:
- `requireAuth(event)` - Server middleware for protected routes

#### Used By
- **workspaces**: For user identification and authentication
- **entitlements**: For user profile and role information
- **billing**: For user context in subscriptions

---

## Level 2: Business Logic

### 6. Billing Layer
**Location**: `layers/billing/`

#### Dependencies
- **uix** (extends)
  - **Why**: Needs UI components for billing interfaces
  - **What**: Uses `<UCard>`, `<UButton>`, `<UTable>` for subscription management UI

- **i18n** (extends)
  - **Why**: Needs currency and date formatting
  - **What**: Uses translation files for billing messages and currency display

- **amplify** (runtime)
  - **Why**: Uses AWS Amplify library operations within the configured context
  - **What**: Imports `aws-amplify/data/server` (operations) to run inside `withAmplifyAuth` (context)

#### Provides
**Composables**:
- `useBilling(workspaceId)` - Workspace-scoped billing state
  ```typescript
  const { subscription, invoices, createCheckout, openPortal } = useBilling(workspaceId)
  ```

**Key Features**:
- Workspace-centric billing (NOT user-centric)
- Stripe integration
- Subscription management
- Invoice history

#### Used By
- **entitlements**: To determine current subscription plan for feature access
- **workspaces**: To display billing status (commented out, planned integration)

#### Server API Endpoints
- `POST /api/billing/checkout` - Create Stripe checkout session
- `POST /api/billing/portal` - Create customer portal session
- `GET /api/billing/subscription` - Get workspace subscription
- `GET /api/billing/invoices` - List workspace invoices
- `POST /api/billing/webhook` - Handle Stripe webhooks

---

### 7. Entitlements Layer
**Location**: `layers/entitlements/`

#### Dependencies
**No explicit `extends`** (standalone configuration)

**Implicit Dependencies** (via composable usage):
- **auth** (uses `useUser()`)
  - **Why**: Needs user profile for role-based permissions
  - **What**: Accesses `userProfile.role` to determine user permissions
  - **Where**: `composables/useEntitlements.ts:3`
  ```typescript
  const { userProfile, isAuthenticated } = useUser()
  const role = computed(() => userProfile.value?.role as Role)
  ```

- **billing** (uses `useBilling()` - currently commented out)
  - **Why**: Needs subscription plan for feature entitlements
  - **What**: Would access `currentPlanId` to determine feature access
  - **Where**: `composables/useEntitlements.ts:4` (commented)
  ```typescript
  // const { currentPlanId } = useBilling()
  // TODO: Re-enable once billing layer is complete
  ```

#### Provides
**Composables**:
- `useEntitlements()` - Authorization and feature access control
  ```typescript
  const {
    canAccessFeature,    // Check if user can access a feature
    hasPermission,       // Check if user has a permission
    getRequiredPlan      // Get plan required for a feature
  } = useEntitlements()
  ```

**Components**:
- `<FeatureGate>` - Conditional rendering based on feature access
  ```vue
  <FeatureGate feature="advanced-analytics">
    <AnalyticsDashboard />
    <template #fallback>
      <UpgradePrompt required-plan="pro" />
    </template>
  </FeatureGate>
  ```

- `<PermissionGuard>` - Conditional rendering based on permissions
  ```vue
  <PermissionGuard permission="manage-users">
    <UserManagementPanel />
  </PermissionGuard>
  ```

- `<UpgradePrompt>` - Upgrade call-to-action
  - **Uses**: `useEntitlements()` to determine required plan
  - **Navigates**: To `/settings/billing?plan=pro`

**Middleware**:
- `permission` - Route protection based on permissions
- `feature` - Route protection based on feature access
- `requirePlan` - Route protection based on subscription plan

**Server Utilities**:
- `requirePermission(event, permission)` - Validate permission or throw 403
  - **Uses**: `requireAuth()` from auth layer
  - **Why**: Must authenticate before checking permissions

- `requireFeature(event, feature)` - Validate feature access or throw 403
  - **Uses**: `requireAuth()` from auth layer
  - **Why**: Must authenticate before checking features

- `requirePlan(event, minPlan)` - Validate subscription plan or throw 403
  - **Uses**: `requireAuth()` from auth layer
  - **Why**: Must authenticate before checking plan

#### Feature-to-Plan Mapping
```typescript
PLAN_FEATURES = {
  free: ['basic-dashboard'],
  pro: ['basic-dashboard', 'advanced-analytics', 'audit-logs', 'data-export', 'webhooks'],
  enterprise: ['...all pro features', 'api-access', 'priority-support', 'custom-branding', 'sso']
}
```

#### Role-to-Permission Mapping
```typescript
ROLE_PERMISSIONS = {
  user: ['view-dashboard', 'manage-profile', 'view-billing'],
  admin: ['...all user permissions', 'manage-users', 'manage-settings'],
  owner: ['...all admin permissions', 'manage-billing', 'export-data']
}
```

#### Used By
- **workspaces**: For workspace-level authorization checks

---

## Level 3: Complex Features

### 8. Workspaces Layer
**Location**: `layers/workspaces/`

#### Dependencies
- **auth** (extends)
  - **Why**: Needs user authentication for workspace membership
  - **What**: Uses `useUser()` to get current user ID and authentication state
  - **Where**: Multiple locations

- **entitlements** (extends)
  - **Why**: Needs permission checks for workspace operations
  - **What**: Uses `useEntitlements()` for role-based access control
  - **Where**: Components and middleware

- **uix** (extends)
  - **Why**: Needs UI components for workspace management
  - **What**: Uses `<UCard>`, `<UButton>`, `<UModal>`, `<UDropdown>` for workspace UI

- **amplify** (runtime)
  - **Why**: Uses AWS Amplify library operations within the configured context
  - **What**: Imports `aws-amplify/auth/server` (operations) to run inside `withAmplifyAuth` (context)

#### Dependency Usage Details

##### 1. useUser() from Auth Layer

**Purpose**: User identification and authentication

**Usage Locations**:

1. **`composables/useWorkspaces.ts`**
   ```typescript
   const { user } = useUser()

   // WHY: Need user ID to filter workspaces
   const loadWorkspaces = async () => {
     if (!user.value) return  // Guard: only load if authenticated
     const result = await $fetch('/api/workspaces')  // Fetches user's workspaces
   }

   // WHY: Need user ID to find personal workspace
   const personalWorkspace = computed(() =>
     workspaces.value.find(w => w.isPersonal && w.ownerId === user.value?.id)
   )
   ```

2. **`composables/useWorkspace.ts`**
   ```typescript
   const { user } = useUser()

   // WHY: Determine if current user is workspace owner
   const isOwner = computed(() =>
     currentWorkspace.value?.ownerId === user.value?.id
   )
   ```

3. **`components/TeamMembersList.vue`**
   ```typescript
   const { user } = useUser()

   // WHY: Prevent user from removing themselves
   const canRemove = (member) => {
     if (member.userId === user.value?.id) return false
     return isOwner.value
   }

   // WHY: Check if user is admin to allow invitations
   const canInvite = computed(() => {
     return isOwner.value || members.value.some(m =>
       m.userId === user.value?.id && m.role === 'ADMIN'
     )
   })
   ```

4. **Server Middleware** (`server/middleware/auth.ts`)
   ```typescript
   // WHY: Attach authenticated user to request context
   event.context.user = authContext.user
   // Used by all /api/workspaces/* endpoints
   ```

##### 2. useEntitlements() from Entitlements Layer

**Purpose**: Permission and role-based access control

**Usage Locations**:

1. **`components/TeamMembersList.vue`**
   ```typescript
   const { isOwner } = useWorkspace()  // Uses entitlements internally

   // WHY: Only owners can remove members
   const canRemove = (member) => {
     if (member.role === 'OWNER') return false
     return isOwner.value  // Permission check
   }
   ```

2. **Future Integration** (planned):
   - Workspace creation limits based on plan
   - Member invitation limits based on plan
   - Advanced workspace features gated by subscription

##### 3. Amplify Server Utilities

**Purpose**: GraphQL data operations

**Usage in ALL Server Endpoints**:

```typescript
import { withAmplifyPublic, getServerPublicDataClient } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

// WHY: Need authenticated context for GraphQL operations
return await withAmplifyPublic(async (contextSpec) => {
  const client = getServerPublicDataClient()

  // WHY: Query workspace data from DynamoDB
  const { data: workspaces } = await client.models.Workspace.list(contextSpec, {
    filter: { ... }
  })
})
```

**Endpoints Using Amplify**:
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/[id]/members` - List workspace members
- `POST /api/workspaces/[id]/members/invite` - Invite member
- `PATCH /api/workspaces/[id]/members/[userId]/role` - Update member role
- `DELETE /api/workspaces/[id]/members/[userId]` - Remove member

#### Provides
**Composables**:
- `useWorkspaces()` - Workspace list and management
  ```typescript
  const {
    workspaces,           // All user's workspaces
    currentWorkspace,     // Currently selected workspace
    personalWorkspace,    // User's personal workspace
    loadWorkspaces,       // Fetch workspaces from API
    createWorkspace,      // Create new workspace
    switchWorkspace       // Change current workspace
  } = useWorkspaces()
  ```

- `useWorkspace()` - Current workspace utilities
  ```typescript
  const {
    workspace,           // Current workspace
    isOwner,            // Is current user the owner?
    requireWorkspace    // Throw error if no workspace
  } = useWorkspace()
  ```

- `useWorkspaceMembers(workspaceId)` - Team member management
  ```typescript
  const {
    members,            // Workspace members
    inviteMember,       // Send invitation
    updateMemberRole,   // Change member role
    removeMember        // Remove member
  } = useWorkspaceMembers(workspaceId)
  ```

**Components**:
- `<WorkspaceSwitcher>` - Dropdown to switch workspaces
- `<CreateWorkspaceModal>` - Modal for workspace creation
- `<TeamMembersList>` - Display and manage team members
- `<InviteTeamMemberModal>` - Modal for inviting members

**Server API Endpoints**:
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/[id]/members` - List members
- `POST /api/workspaces/[id]/members/invite` - Invite member
- `PATCH /api/workspaces/[id]/members/[userId]/role` - Update role
- `DELETE /api/workspaces/[id]/members/[userId]` - Remove member
- `GET /api/workspaces/[id]/invitations` - List pending invitations

#### Multi-Tenancy Model
- **Personal Workspace**: Auto-created for each user (isPersonal=true)
- **Team Workspaces**: Created by users, shared with team
- **Workspace Roles**: OWNER (creator), ADMIN (elevated), MEMBER (basic)

---

## Dependency Matrix

| Layer | Extends | Uses (Composables) | Uses (Server Utils) | Uses (Components) | Runtime (Libs) |
|-------|---------|-------------------|---------------------|-------------------|
| **amplify** | - | - | - | - |
| **uix** | - | - | - | - |
| **i18n** | - | - | - | - |
| **debug** | - | useUser, useBilling | - | - |
| **auth** | uix | - | - | UCard, UButton, UInput | aws-amplify/auth |
| **billing** | uix, i18n | - | withAmplifyAuth, withAmplifyPublic | UCard, UButton, UTable | aws-amplify/data |
| **entitlements** | - | useUser, (useBilling*) | requireAuth | - | - |
| **workspaces** | auth, entitlements, uix | useUser, useEntitlements | withAmplifyPublic, requireAuth | UCard, UButton, UModal, UDropdown | aws-amplify/auth |

*Currently commented out, planned integration

---

## Key Patterns

### 1. Composable Composition Pattern
Layers import composables from dependencies to build higher-level functionality:

```typescript
// entitlements uses auth
const { userProfile } = useUser()
const role = computed(() => userProfile.value?.role)

// workspaces uses auth
const { user } = useUser()
const isOwner = computed(() => workspace.value?.ownerId === user.value?.id)
```

### 2. Server Utility Chaining
Server utilities build on each other for layered validation:

```typescript
// entitlements/server/utils/requireFeature.ts
export const requireFeature = async (event, feature) => {
  await requireAuth(event)  // First: authenticate (from auth layer)
  // Then: check feature access
  if (!canAccessFeature(feature)) throw error
}
```

### 3. Workspace-Scoped State
Billing and other features are scoped to workspaces, not users:

```typescript
// Workspace-centric billing
const { subscription } = useBilling(currentWorkspaceId.value)

// NOT user-centric
// const { subscription } = useBilling(userId) ❌
```

### 4. Conditional Rendering with Entitlements
Components use entitlements for feature gating:

```vue
<FeatureGate feature="advanced-analytics">
  <AnalyticsDashboard />
  <template #fallback>
    <UpgradePrompt required-plan="pro" />
  </template>
</FeatureGate>
```

---

## Integration Points

### Auth → Workspaces
- **What**: User ID and authentication state
- **Why**: Identify workspace membership and ownership
- **How**: `useUser()` composable provides `user.value.id`

### Auth → Entitlements
- **What**: User profile and role
- **Why**: Determine role-based permissions
- **How**: `useUser()` composable provides `userProfile.value.role`

### Billing → Entitlements
- **What**: Current subscription plan
- **Why**: Determine feature access based on plan
- **How**: `useBilling()` composable provides `currentPlanId` (planned)

### Entitlements → Workspaces
- **What**: Permission checks and role validation
- **Why**: Control workspace operations based on user role
- **How**: `useEntitlements()` composable provides `hasPermission()`

### Amplify → All Data Layers
- **What**: GraphQL client and authentication context
- **Why**: Interact with DynamoDB and AppSync
- **How**: `withAmplifyPublic()` and `getServerPublicDataClient()`

---

## Future Dependencies (Planned)

### Billing → Workspaces
- **What**: Workspace subscription limits
- **Why**: Enforce plan-based workspace creation limits
- **Status**: Currently commented out in entitlements layer

### Notifications → All Layers
- **What**: Email and in-app notifications
- **Why**: Notify users of workspace invitations, billing events, etc.
- **Status**: Not yet implemented

---

## Conclusion

The layer architecture follows a clear dependency hierarchy:

1. **Infrastructure layers** (amplify, uix, i18n) provide foundational services
2. **Auth layer** provides user identity and authentication
3. **Business logic layers** (billing, entitlements) provide domain-specific functionality
4. **Feature layers** (workspaces) compose multiple layers for complex features

Each dependency serves a specific purpose:
- **useUser()**: User identification and authentication state
- **useBilling()**: Subscription and payment management
- **useEntitlements()**: Authorization and feature access control
- **Amplify utilities**: Data persistence and GraphQL operations
- **UI components**: Consistent user interface

This architecture enables:
- ✅ **Modularity**: Each layer has a single responsibility
- ✅ **Reusability**: Layers can be composed in different applications
- ✅ **Type Safety**: TypeScript ensures correct usage across layers
- ✅ **Testability**: Layers can be tested independently
- ✅ **Scalability**: New features can be added as new layers
