# PRD: Entitlements Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
  - [2.1 Feature Access Check Flow](#21-feature-access-check-flow)
  - [2.2 Permission Denied Flow](#22-permission-denied-flow)
  - [2.3 Plan Upgrade Required Flow](#23-plan-upgrade-required-flow)
  - [2.4 Role-Based Access Flow](#24-role-based-access-flow)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Data Model](#31-data-model)
  - [3.2 Composables](#32-composables)
  - [3.3 Components](#33-components)
  - [3.4 Middlewares](#34-middlewares)
  - [3.5 Utilities](#35-utilities)
  - [3.6 Server Utilities](#36-server-utilities)
  - [3.7 tRPC Procedures](#37-trpc-procedures)
- [4. Testing](#4-testing)
  - [4.1 Unit Tests (Minimal)](#41-unit-tests-minimal)
  - [4.2 E2E Tests (Primary)](#42-e2e-tests-primary)
- [5. Implementation](#5-implementation)
  - [5.1 Layer Structure](#51-layer-structure)
  - [5.2 Definition of Done](#52-definition-of-done)
  - [5.3 Plan](#53-plan)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1 Security](#61-security)
  - [6.2 Performance](#62-performance)
  - [6.3 Maintainability](#63-maintainability)

## 1. Overview

### 1.1 Purpose

The Entitlements Layer provides authorization and feature access control for a Nuxt 4-based SaaS application. It manages role-based access control (RBAC), feature entitlements based on subscription plans, and permission validation across client and server contexts. This layer bridges authentication (Auth Layer) and billing (Billing Layer) to control what authenticated users can access based on their subscription tier and assigned roles.

### 1.2 Scope

**Includes**:
- Role-based access control (RBAC) system with predefined roles
- Feature entitlements based on subscription plans (free, pro, enterprise)
- Permission validation for routes, components, and API endpoints
- SSR-compatible permission checking with universal API
- Integration with Auth Layer (user authentication) and Billing Layer (subscription status)
- Permission middleware for route protection
- Server-side authorization utilities for API routes and tRPC procedures
- Feature flag system for controlled rollouts

**Excludes**:
- User authentication (handled by Auth Layer)
- Subscription management and billing (handled by Billing Layer)
- Workspace-level permissions (handled by Workspaces Layer)
- Team member role assignments (handled by Workspaces Layer)
- Usage-based metering and quotas (future enhancement)

### 1.3 Key Requirements

**Technical**:
- SSR-safe composables with universal API (client/server)
- Permission caching to minimize redundant checks
- Type-safe permission and role definitions
- Integration with Auth and Billing layers via composables
- Server-side permission validation for API security
- Reactive permission state that updates with subscription changes

**Functional**:
- User can access features allowed by their subscription plan
- System blocks access to features not included in user's plan
- User receives clear messaging when upgrade is required
- Admins can define custom role permissions
- Server validates permissions before executing sensitive operations
- Permission checks work consistently across client and server

**Authorization Model**:
- **Plan-Based Entitlements**: Features controlled by subscription tier (free/pro/enterprise)
- **Role-Based Permissions**: Actions controlled by user roles (user/admin/owner)
- **Feature Flags**: Gradual feature rollout independent of plans

### 1.4 Artifacts

**Types**:
- `EntitlementsState` - Reactive entitlements state (non-persistent)
- `Permission` - Permission definition TypeScript type
- `Role` - User role definition TypeScript type
- `Feature` - Feature identifier and metadata TypeScript type
- `PlanFeatures` - Plan-to-features mapping TypeScript type

**Note**: Entitlements layer does not define persistent data models. Permission and feature entitlements are derived from:
- User roles (from Auth Layer's UserProfile)
- Workspace subscription plans (from Billing Layer's SubscriptionPlan)

**Composables**:
- `useEntitlements()` - Universal entitlements state and permission checking (client & server)

**Components**:
- `<FeatureGate>` - Conditional rendering based on feature access
- `<UpgradePrompt>` - Display upgrade prompt when feature is locked
- `<PermissionGuard>` - Guard component for permission-based rendering

**Middlewares**:
- `permission` (client & server) - Protect routes based on permissions
- `feature` (client & server) - Protect routes based on feature entitlements
- `requirePlan` (client & server) - Require specific subscription plan

**Server Utilities**:
- `requirePermission(event, permission)` - Validate permission or throw 403
- `requireFeature(event, feature)` - Validate feature access or throw 403
- `requirePlan(event, plan)` - Validate subscription plan or throw 403
- `withPermission(handler, permission)` - HOF wrapper for protected endpoints
- `withFeature(handler, feature)` - HOF wrapper for feature-gated endpoints

**tRPC Procedures** (`layers/entitlements/server/trpc/routers/entitlements.ts`):
- `entitlements.get` (query) - Get current user entitlements and permissions
- `entitlements.checkFeature` (query) - Check access to specific feature
- `entitlements.checkPermission` (query) - Check specific permission
- `entitlements.listFeatures` (query) - List all available features with access status

**Utilities**:
- `definePermissions()` - Type-safe permission definitions
- `defineFeatures()` - Type-safe feature definitions
- `definePlanFeatures()` - Type-safe plan-feature mappings


## 2. User Flows

### 2.1 Feature Access Check Flow

**Actors**: Authenticated User, System

**Preconditions**:
- User is authenticated
- User has active subscription

**Flow**:
1. User attempts to access a feature (e.g., clicks "Advanced Analytics" menu item)
2. System checks user's subscription plan via `useBilling()`
3. System checks if plan includes the requested feature via `useEntitlements().canAccessFeature()`
4. **If Authorized**:
   - System allows access to feature
   - User sees feature content
5. **If Not Authorized**:
   - System blocks access
   - Proceeds to Permission Denied Flow

**Success Criteria**:
- Feature access granted within 50ms (cached permissions)
- Permission check works identically on client and server
- No flash of unauthorized content (SSR renders correct state)

### 2.2 Permission Denied Flow

**Actors**: Authenticated User, System

**Preconditions**:
- User attempted to access unauthorized feature
- User does not have required subscription plan or permission

**Flow**:
1. System determines user lacks required permission/feature
2. **If route-level access**: System redirects to upgrade page or dashboard
3. **If component-level access**: System shows `<UpgradePrompt>` component
4. User sees clear message explaining:
   - Why access was denied (plan limitation)
   - Which plan is required for access
   - Call-to-action to upgrade
5. User can click "Upgrade" button to navigate to billing page

**Success Criteria**:
- Clear, user-friendly error message displayed
- User understands which plan they need
- One-click path to upgrade flow
- No technical errors exposed to user

### 2.3 Plan Upgrade Required Flow

**Actors**: Authenticated User, System

**Preconditions**:
- User attempted to access pro/enterprise feature
- User has free or lower-tier plan

**Flow**:
1. User clicks on feature requiring higher plan (e.g., "API Access")
2. System checks entitlement: `canAccessFeature('api-access')` returns `false`
3. System determines current plan: `free`, required plan: `enterprise`
4. System displays upgrade prompt modal with:
   - Feature name: "API Access"
   - Current plan: "Free"
   - Required plan: "Enterprise"
   - Upgrade button
5. User clicks "Upgrade to Enterprise" button
6. System navigates to `/billing?plan=enterprise`
7. User completes subscription upgrade via Billing Layer
8. System refreshes entitlements state
9. User now has access to feature

**Success Criteria**:
- Upgrade prompt appears immediately (no loading state)
- Plan requirements clearly communicated
- Seamless navigation to billing flow
- Automatic permission refresh after upgrade

### 2.4 Role-Based Access Flow

**Actors**: Authenticated User (with assigned role), System

**Preconditions**:
- User is authenticated
- User has assigned role (e.g., "admin")

**Flow**:
1. User navigates to admin-only page (e.g., `/admin/users`)
2. `permission` middleware intercepts navigation
3. System checks user role via `useEntitlements().hasPermission('manage-users')`
4. **If Authorized (admin role)**:
   - Middleware allows navigation
   - Page renders with admin controls
5. **If Not Authorized (user role)**:
   - Middleware redirects to `/dashboard`
   - System shows error toast: "You don't have permission to access this page"

**Success Criteria**:
- Permission check completes before page render (SSR)
- Unauthorized users never see protected content
- Clear feedback provided for denied access
- Role-based checks work for routes, components, and API calls


## 3. Technical Specifications

### 3.1 Types

#### 3.1.1 Core Types

**Location**: `layers/entitlements/types/entitlements.ts`

**Type Definitions**:
- `Plan`: 'free' | 'pro' | 'enterprise'
- `Role`: 'user' | 'admin' | 'owner'
- `Feature`: Feature identifiers for plan-based entitlements (basic-dashboard, advanced-analytics, api-access, priority-support, custom-branding, audit-logs, sso, data-export, webhooks, custom-integrations)
- `Permission`: Permission identifiers for role-based access control (view-dashboard, manage-profile, view-billing, manage-billing, manage-users, manage-settings, view-analytics, access-api, export-data)

**State Interfaces**:
- `EntitlementsState`: Reactive state with plan, role, features, permissions, loading, error, lastUpdated
- `FeatureDefinition`: Feature metadata with id, name, description, requiredPlan, enabled, beta?
- `PermissionDefinition`: Permission metadata with id, name, description, requiredRole
- `PlanFeatures`: Mapping of plans to feature arrays
- `RolePermissions`: Mapping of roles to permission arrays

#### 3.1.2 Feature Definitions

**Location**: `layers/entitlements/config/features.ts`

**Feature Catalog**:
- Free Plan: basic-dashboard
- Pro Plan: basic-dashboard, advanced-analytics, audit-logs, data-export, webhooks
- Enterprise Plan: All pro features + api-access, priority-support, custom-branding, sso, custom-integrations

**Structure**:
- `FEATURES`: Record<Feature, FeatureDefinition> with complete metadata
- `PLAN_FEATURES`: Hierarchical mapping where higher plans inherit all lower plan features

#### 3.1.3 Permission Definitions

**Location**: `layers/entitlements/config/permissions.ts`

**Permission Catalog**:
- User Role: view-dashboard, manage-profile, view-billing, view-analytics, access-api
- Admin Role: All user permissions + manage-users, manage-settings
- Owner Role: All admin permissions + manage-billing, export-data

**Structure**:
- `PERMISSIONS`: Record<Permission, PermissionDefinition> with complete metadata
- `ROLE_PERMISSIONS`: Hierarchical mapping where higher roles inherit all lower role permissions

### 3.2 Composables

### 3.2.1 useEntitlements() Implementation

```typescript
export function useEntitlements() {
  const { user } = useUser()
  const { currentWorkspace } = useWorkspaces()

  // ✅ Get subscription from WORKSPACE, not user
  const subscriptionPlan = computed(() => {
    return currentWorkspace.value?.subscription?.planId || 'free'
  })

  const canAccessFeature = (feature: Feature) => {
    const plan = subscriptionPlan.value
    return PLAN_FEATURES[plan]?.includes(feature) || false
  }

  return { canAccessFeature, subscriptionPlan }
}

### 3.3 Components

#### 3.3.1 `<FeatureGate>`

**Location**: `layers/entitlements/components/FeatureGate.vue`

**Purpose**: Conditional rendering based on feature entitlements

**Props**: feature (required), fallback (optional)
**Slots**: default (when access granted), fallback (when denied)

#### 3.3.2 `<UpgradePrompt>`

**Location**: `layers/entitlements/components/UpgradePrompt.vue`

**Purpose**: Display upgrade prompt when feature requires higher plan

**Props**: feature (optional), requiredPlan (required), title (optional), description (optional)
**Behavior**: Navigates to /billing with plan parameter on upgrade click

#### 3.3.3 `<PermissionGuard>`

**Location**: `layers/entitlements/components/PermissionGuard.vue`

**Purpose**: Guard component for permission-based rendering

**Props**: permission (single or array), requireAll (default true), fallback (optional)
**Slots**: default (when permission granted), fallback (when denied)

### 3.4 Middlewares

#### 3.4.1 `permission` Middleware

**Location**: `layers/entitlements/middleware/permission.ts`

**Purpose**: Protect routes based on user permissions

**Behavior**: Reads permission from route meta, redirects to /dashboard with error query if denied
**Usage**: definePageMeta({ middleware: ['auth', 'permission'], permission: 'manage-users' })

#### 3.4.2 `feature` Middleware

**Location**: `layers/entitlements/middleware/feature.ts`

**Purpose**: Protect routes based on feature entitlements

**Behavior**: Reads feature from route meta, redirects to /upgrade with feature and plan query if denied
**Usage**: definePageMeta({ middleware: ['auth', 'feature'], feature: 'advanced-analytics' })

#### 3.4.3 `requirePlan` Middleware

**Location**: `layers/entitlements/middleware/requirePlan.ts`

**Purpose**: Require specific subscription plan for route access

**Behavior**: Reads requiredPlan from route meta, redirects to /upgrade with plan query if not met
**Usage**: definePageMeta({ middleware: ['auth', 'requirePlan'], requiredPlan: 'enterprise' })

### 3.5 Server Utilities

#### 3.6.1 `requirePermission()`

**Location**: `layers/entitlements/server/utils/requirePermission.ts`

**Purpose**: Validate permission or throw 403 error
**Signature**: requirePermission(event: H3Event, permission: Permission): Promise<void>

#### 3.6.2 `requireFeature()`

**Location**: `layers/entitlements/server/utils/requireFeature.ts`

**Purpose**: Validate feature access or throw 403 error with required plan details
**Signature**: requireFeature(event: H3Event, feature: Feature): Promise<void>

#### 3.6.3 `requirePlan()`

**Location**: `layers/entitlements/server/utils/requirePlan.ts`

**Purpose**: Validate subscription plan or throw 403 error
**Signature**: requirePlan(event: H3Event, minPlan: Plan): Promise<void>

#### 3.6.4 Higher-Order Function Wrappers

**Locations**:
- `layers/entitlements/server/utils/withPermission.ts`
- `layers/entitlements/server/utils/withFeature.ts`

**Purpose**: HOF wrappers to protect endpoint handlers with permission or feature checks

### 3.6 tRPC Procedures

**Location**: `layers/entitlements/server/trpc/routers/entitlements.ts`

**Procedures**:
- `entitlements.get` (query): Get current user entitlements and permissions
- `entitlements.checkFeature` (query): Check access to specific feature
- `entitlements.checkPermission` (query): Check specific permission
- `entitlements.listFeatures` (query): List all available features with access status

### 3.7 Utilities

#### 3.7.1 Type-Safe Permission Definitions

**Location**: `layers/entitlements/utils/definePermissions.ts`

**Purpose**: Type-safe helper for defining custom permissions with automatic ID assignment

#### 3.7.2 Type-Safe Feature Definitions

**Location**: `layers/entitlements/utils/defineFeatures.ts`

**Purpose**: Type-safe helper for defining custom features with automatic ID assignment


## 4. Testing

### 4.1 Unit Tests (Minimal)

**Scope**: Core business logic for entitlements validation

**Test Cases**:
- Permission resolution logic validates correctly
- Feature-to-plan mapping returns correct values
- Role hierarchy comparison works properly
- Plan hierarchy comparison works properly

**Tools**: Vitest

### 4.2 E2E Tests (Primary)

**Scope**: End-to-end user flows for feature access and permission validation

**Test Cases**:
1. **Feature Access Flow**: Free/pro/enterprise users accessing plan-appropriate features, upgrade prompts
2. **Permission Validation Flow**: Role-based access control, permission denied messages
3. **Middleware Protection**: Route middleware redirects for unauthorized access
4. **Server-Side Authorization**: API endpoint rejection, tRPC validation, 403 error handling

**Tools**: Playwright


## 5. Implementation

### 5.1 Layer Structure

```
layers/entitlements/
├── components/
│   ├── FeatureGate.vue
│   ├── UpgradePrompt.vue
│   └── PermissionGuard.vue
├── composables/
│   └── useEntitlements.ts
├── config/
│   ├── features.ts             # Feature definitions and plan mappings
│   └── permissions.ts          # Permission definitions and role mappings
├── middleware/
│   ├── permission.ts
│   ├── feature.ts
│   └── requirePlan.ts
├── server/
│   ├── trpc/
│   │   └── routers/
│   │       └── entitlements.ts  # tRPC entitlements router
│   └── utils/
│       ├── requirePermission.ts
│       ├── requireFeature.ts
│       ├── requirePlan.ts
│       ├── withPermission.ts
│       └── withFeature.ts
├── types/
│   └── entitlements.ts         # TypeScript type definitions
├── utils/
│   ├── definePermissions.ts
│   └── defineFeatures.ts
├── tests/
│   ├── unit/
│   │   ├── permissions.test.ts
│   │   └── features.test.ts
│   └── e2e/
│       ├── feature-access.spec.ts
│       └── permissions.spec.ts
├── nuxt.config.ts
├── package.json
└── README.md
```

### 5.2 Definition of Done

**Code Complete**:
- [ ] All composables implemented with SSR compatibility
- [ ] All components implemented with proper TypeScript types
- [ ] All middlewares implemented with route protection
- [ ] All server utilities implemented with error handling
- [ ] tRPC router implemented with validation schemas

**Type Safety**:
- [ ] All TypeScript types exported from types/ directory
- [ ] No `any` types in public API
- [ ] Type-safe feature and permission definitions
- [ ] Auto-imported composables and utilities

**Testing**:
- [ ] Unit tests for permission/feature resolution logic
- [ ] E2E tests for all user flows (feature access, permissions, upgrade prompts)
- [ ] E2E tests for middleware protection
- [ ] E2E tests for server-side authorization

**Documentation**:
- [ ] README with setup instructions and usage examples
- [ ] JSDoc comments for all exported functions and types
- [ ] Examples for common use cases (components, middleware, server)

**Integration**:
- [ ] Auth Layer integration via useUser()
- [ ] Billing Layer integration via useBilling()
- [ ] tRPC router registered in main tRPC router
- [ ] Middleware registered in Nuxt configuration

**Quality**:
- [ ] ESLint passing with no errors
- [ ] TypeScript compilation with no errors
- [ ] All tests passing
- [ ] No console errors in browser

### 5.3 Plan
See [Entitlements Implementation Plan](../plan/entitlements.md).


## 6. Non-Functional Requirements

### 6.1 Security

**Authorization Enforcement**:
- All permission checks validated server-side for sensitive operations
- Client-side checks for UX only, never for security
- API endpoints protected with server utilities (requirePermission, requireFeature)
- tRPC procedures validate entitlements before execution

**Token Validation**:
- Subscription status validated from authoritative source (Billing Layer)
- User roles validated from authenticated session (Auth Layer)
- No client-side role/plan manipulation possible

**Error Handling**:
- 403 Forbidden for permission/feature denied
- Clear error messages without exposing system internals
- Logging of authorization failures for security monitoring

### 6.2 Performance

**Caching Strategy**:
- Permission checks cached during request lifecycle
- Feature entitlements computed once per render
- Subscription status cached with TTL (from Billing Layer)

**Lazy Loading**:
- Feature definitions loaded on-demand when needed
- Permission configurations tree-shaken in production

**Response Times**:
- Permission check: < 50ms (cached)
- Feature check: < 50ms (cached)
- tRPC entitlements query: < 200ms (with subscription lookup)

**Optimization**:
- Computed refs for reactive entitlements state
- Minimal re-computation on dependency changes
- Server-side entitlements resolved once per request

### 6.3 Maintainability

**Extensibility**:
- Easy to add new features and permissions via config
- Type-safe definitions prevent runtime errors
- Clear separation between feature entitlements and role permissions

**Configuration Management**:
- Single source of truth for features (config/features.ts)
- Single source of truth for permissions (config/permissions.ts)
- Hierarchical plan/role system for easy additions

**Testing**:
- Unit tests validate configuration integrity
- E2E tests cover all user flows
- Test utilities provided for custom extensions

**Documentation**:
- Comprehensive inline JSDoc comments
- README with common use cases
- Type definitions serve as documentation
