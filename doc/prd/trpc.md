# PRD: tRPC Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Architecture Pattern](#31-architecture-pattern)
  - [3.2 Procedure Types](#32-procedure-types)
  - [3.3 Router Organization](#33-router-organization)
  - [3.4 Validation Schemas](#34-validation-schemas)
  - [3.5 Client Usage Patterns](#35-client-usage-patterns)
  - [3.6 Error Handling](#36-error-handling)
- [4. Testing](#4-testing)
  - [4.1 Procedure Testing](#41-procedure-testing)
  - [4.2 Client-Side Testing](#42-client-side-testing)
- [5. Implementation](#5-implementation)
  - [5.1 Layer Structure](#51-layer-structure)
  - [5.2 Definition of Done](#52-definition-of-done)
  - [5.3 Plan](#53-plan)
  - [5.4 Migration Strategy (REST → tRPC)](#54-migration-strategy-rest--trpc)
  - [5.5 Development Workflow](#55-development-workflow)
- [6. Non-Functional Requirements](#6-non-functional-requirements)

## 1. Overview

### 1.1 Purpose

The tRPC Layer provides end-to-end type-safe API functionality for custom business logic that extends beyond basic Amplify GraphQL operations. It enables building type-safe APIs with automatic client-server type inference, runtime validation, and excellent developer experience for complex operations involving multiple services.

### 1.2 Scope

**Includes**:
- Type-safe API procedures with automatic inference
- Runtime input/output validation using Zod
- Protected and public procedure patterns
- Integration with Amplify authentication context
- Error handling with structured TRPCError
- Request batching and caching optimizations
- Nuxt composables integration (`useQuery`, `useMutation`)

**Excludes**:
- Direct Amplify resource access (use GraphQL for UserProfile, SubscriptionPlan, etc.)
- External webhook handling (use REST for Stripe webhooks, etc.)
- Simple CRUD operations already handled by Amplify GraphQL
- Real-time subscriptions (use GraphQL subscriptions or WebSockets)

### 1.3 Key Requirements

**Technical**:
- Full TypeScript type inference from server to client
- Zod schema validation for all inputs and outputs
- Integration with Amplify authentication context
- Support for both public and protected procedures
- Compatible with Nuxt SSR and client-side rendering
- Automatic error handling with structured errors

**Functional**:
- Complex business logic operations (multi-step, multi-service)
- Type-safe third-party API integration wrappers
- Data aggregation from multiple sources
- Custom validation rules beyond basic GraphQL capabilities
- Optimistic UI updates with automatic cache invalidation

### 1.4 Artifacts

**Core Infrastructure** (tRPC Layer):
- `server/trpc/context.ts` - Request context creation with Amplify auth
- `server/trpc/trpc.ts` - tRPC instance, procedures, and middleware
- `server/api/trpc/[trpc].ts` - Nuxt API handler for tRPC endpoints
- `plugins/client.ts` - tRPC client plugin for Nuxt
- `types/index.ts` - Type exports for client usage
- `server/trpc/routers/index.ts` - Main app router (aggregates all layer routers)

**Example Router** (tRPC Layer):
- `server/trpc/routers/example.ts` - Example procedures demonstrating patterns

**Layer-Specific Routers (Examples in each layer)**:
- Each layer implements its own router in `layers/{layer-name}/server/trpc/routers/{layer-name}.ts`
- Examples:
  - `layers/billing/server/trpc/routers/billing.ts` - Billing layer procedures
  - `layers/auth/server/trpc/routers/auth.ts` - Auth layer procedures
  - `layers/admin/server/trpc/routers/admin.ts` - Admin layer procedures


## 2. User Flows

The tRPC layer provides infrastructure only and does not implement user-facing flows. User flows are defined in the PRDs of layers that implement tRPC procedures (e.g., Billing Layer, Auth Layer).

## 3. Technical Specifications

### 3.1 Architecture Pattern

#### 3.1.1 Distributed Router Architecture

The tRPC layer provides **infrastructure only**. Each application layer implements its own tRPC router with layer-specific procedures.

**Directory Structure**:

```
layers/trpc/                          # tRPC Infrastructure Layer
├── server/trpc/
│   ├── context.ts                    # Shared context (Amplify auth)
│   ├── trpc.ts                       # Shared procedures (public, protected)
│   └── routers/
│       ├── index.ts                  # Main router (aggregates all layers)
│       └── example.ts                # Example procedures only
├── plugins/client.ts                 # tRPC client plugin
└── types/index.ts                    # Type exports

layers/{layer-name}/                  # Other Application Layers
└── server/trpc/routers/
    └── {layer-name}.ts               # Layer-specific procedures
```

**Main Router Registration** (`layers/trpc/server/trpc/routers/index.ts`):

```typescript
import { router } from '../trpc'
import { exampleRouter } from './example'

// Import routers from other layers
import { layerARouter } from '@layers/layer-a/server/trpc/routers/layer-a'
import { layerBRouter } from '@layers/layer-b/server/trpc/routers/layer-b'

export const appRouter = router({
  example: exampleRouter,      // Remove after implementing real routers
  layerA: layerARouter,         // From layer-a
  layerB: layerBRouter,         // From layer-b
})

export type AppRouter = typeof appRouter
```

**Client Usage** (all layer routers accessible via unified client):

```typescript
// Layer A procedures
$trpc.layerA.doSomething.mutate({ ... })
$trpc.layerA.getData.useQuery()

// Layer B procedures
$trpc.layerB.process.mutate({ ... })
$trpc.layerB.listItems.useQuery({ ... })
```

**Benefits**:
- ✅ Each layer owns its API surface
- ✅ No central router file that grows indefinitely
- ✅ Layer deletion removes its router automatically
- ✅ Type safety across all layers with automatic aggregation
- ✅ Teams work on layer routers independently

#### 3.1.2 Auto-Discovery of Layer Routers (Build-Time Code Generation)

**Problem**: Manual router composition breaks layer automaticity. When adding a layer to `extends`, developers must manually import and register its router in the app's `appRouter`, defeating the purpose of Nuxt's layer system.

**Solution**: Build-time code generation that automatically discovers and composes routers from all layers in `extends`.

##### How It Works

1. **Convention**: Each feature layer exports its router following a standard pattern:
   ```
   layers/{layer-name}/server/trpc/routers/{layer-name}.ts
   └── export const {layerName}Router = router({ ... })
   ```

2. **Nuxt Hook**: The tRPC layer registers a `build:before` hook that:
   - Scans all layers declared in `extends`
   - Searches for `server/trpc/routers/*.ts` files
   - Generates TypeScript code that imports and composes all found routers

3. **Generated Code**: Creates `.nuxt/trpc-router.ts`:
   ```typescript
   // Auto-generated by tRPC layer - DO NOT EDIT
   import { router } from '@starter-nuxt-amplify-saas/trpc/server/trpc/trpc'
   import { workspacesRouter } from '@starter-nuxt-amplify-saas/workspaces/server/trpc/routers/workspaces'
   import { entitlementsRouter } from '@starter-nuxt-amplify-saas/entitlements/server/trpc/routers/entitlements'

   export const appRouter = router({
     workspaces: workspacesRouter,
     entitlements: entitlementsRouter,
   })

   export type AppRouter = typeof appRouter
   ```

4. **API Handler**: Uses the generated router:
   ```typescript
   // apps/saas/server/api/trpc/[trpc].ts
   import { createNuxtApiHandler } from 'trpc-nuxt'
   import { appRouter } from '#build/trpc-router'  // ← generated
   import { createContext } from '@starter-nuxt-amplify-saas/trpc/server/trpc/context'

   export default createNuxtApiHandler({
     router: appRouter,
     createContext,
   })
   ```

##### Implementation Details

**Nuxt Hook** (`layers/trpc/nuxt.config.ts`):
```typescript
import { defineNuxtConfig } from 'nuxt/config'
import { existsSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'

export default defineNuxtConfig({
  build: {
    transpile: ['trpc-nuxt']
  },

  hooks: {
    'build:before': (nuxt) => {
      const routers = []

      // Scan all layers for tRPC routers
      for (const layer of nuxt.options._layers) {
        const routersPath = join(layer.cwd, 'server/trpc/routers')

        if (!existsSync(routersPath)) continue

        const files = readdirSync(routersPath).filter(f => f.endsWith('.ts'))

        for (const file of files) {
          const routerName = file.replace('.ts', '')
          const layerName = layer.config.name || 'unknown'

          routers.push({
            name: routerName,
            exportName: `${routerName}Router`,
            importPath: `@starter-nuxt-amplify-saas/${layerName}/server/trpc/routers/${routerName}`,
          })
        }
      }

      // Generate TypeScript code
      const code = `
// Auto-generated by tRPC layer - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
import { router } from '@starter-nuxt-amplify-saas/trpc/server/trpc/trpc'
${routers.map(r => `import { ${r.exportName} } from '${r.importPath}'`).join('\n')}

export const appRouter = router({
${routers.map(r => `  ${r.name}: ${r.exportName},`).join('\n')}
})

export type AppRouter = typeof appRouter
`

      // Write to .nuxt/trpc-router.ts
      const outputPath = join(nuxt.options.buildDir, 'trpc-router.ts')
      writeFileSync(outputPath, code, 'utf-8')

      console.log(`✅ [tRPC] Generated router with ${routers.length} routers`)
    }
  }
})
```

##### Naming Conventions

| Convention | Example | Required |
|------------|---------|----------|
| **File location** | `layers/{layer}/server/trpc/routers/{name}.ts` | ✅ Yes |
| **Export name** | `export const {name}Router` | ✅ Yes |
| **Router namespace** | Accessed as `$trpc.{name}.*` | Auto |

**Example**:
```typescript
// layers/workspaces/server/trpc/routers/workspaces.ts
export const workspacesRouter = router({
  list: protectedProcedure.query(...),
  create: protectedProcedure.mutation(...),
})

// Client usage (auto-generated)
$trpc.workspaces.list.useQuery()
$trpc.workspaces.create.mutate({ name: 'My Workspace' })
```

##### Benefits

**For Developers**:
- ✅ **Zero Configuration**: Add layer to `extends` → router auto-included
- ✅ **Type Safety**: Full TypeScript inference from generated code
- ✅ **Explicit Errors**: Build fails if naming convention violated
- ✅ **Visibility**: Can inspect generated `.nuxt/trpc-router.ts`

**For Architecture**:
- ✅ **True Layer Autonomy**: Layers self-contain their API surface
- ✅ **Automatic Cleanup**: Remove layer from `extends` → router excluded
- ✅ **Scalability**: Add 100 layers → zero manual registration
- ✅ **Consistency**: Enforces standard naming across all layers

##### Trade-offs

**Accepted**:
- ⚠️ **Strict Convention**: Must follow file/export naming pattern
- ⚠️ **Build Step**: Adds ~100ms to build time
- ⚠️ **HMR Limitation**: Adding new router may require rebuild

**Mitigated**:
- ✅ Clear error messages for convention violations
- ✅ Fast rebuild (only regenerates on layer changes)
- ✅ Manual override: App can still import routers explicitly if needed

##### Alternative: Manual Composition (Not Recommended)

If auto-discovery is disabled, apps must manually compose:

```typescript
// apps/saas/server/trpc/routers/index.ts
import { router } from '@starter-nuxt-amplify-saas/trpc/server/trpc/trpc'
import { workspacesRouter } from '@starter-nuxt-amplify-saas/workspaces/server/trpc/routers/workspaces'
import { entitlementsRouter } from '@starter-nuxt-amplify-saas/entitlements/server/trpc/routers/entitlements'

export const appRouter = router({
  workspaces: workspacesRouter,
  entitlements: entitlementsRouter,
})

export type AppRouter = typeof appRouter
```

**Why Not Recommended**:
- ❌ Breaks layer automaticity
- ❌ Manual maintenance burden
- ❌ Easy to forget when adding/removing layers
- ❌ Defeats purpose of Nuxt layer system

#### 3.1.3 Hybrid API Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
├─────────────────────────────────────────────────────────┤
│  Amplify GraphQL    │    tRPC Client     │  REST Fetch  │
│  (Direct AWS Data)  │  (Business Logic)  │  (Webhooks)  │
└──────────┬──────────┴─────────┬──────────┴──────┬───────┘
           │                    │                  │
           ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                     Server Layer                        │
├─────────────────────────────────────────────────────────┤
│  AppSync GraphQL    │  tRPC Procedures   │  REST Routes │
│  ├─ UserProfile     │  ├─ Layer A        │  ├─ Webhook  │
│  ├─ Resources       │  ├─ Layer B        │  └─ Public   │
│  └─ DataModels      │  └─ Layer C        │              │
└──────────┬──────────┴─────────┬──────────┴──────────────┘
           │                    │
           ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│               Backend Services Layer                     │
├─────────────────────────────────────────────────────────┤
│  DynamoDB  │  Cognito  │  External APIs  │  S3  │Lambda │
└─────────────────────────────────────────────────────────┘
```

**Routing Decision Matrix**:

| Operation Type | Use | Rationale |
|---------------|-----|-----------|
| Direct AWS resource CRUD | **Amplify GraphQL** | Type-safe, auto-generated, optimized for DynamoDB |
| Multi-step business logic | **tRPC** | Type-safe, validated, custom orchestration |
| External service integration | **tRPC** | Validated inputs, type-safe responses |
| Data aggregation | **tRPC** | Single request, complex logic |
| External webhooks | **REST** | Must expose standard HTTP endpoints |
| Public marketing APIs | **REST** | Simple, standard HTTP semantics |

#### 3.1.3 API Architecture Decision

**Use tRPC for:**
- Internal business logic
- Type-safe frontend-backend communication
- Complex input validation with Zod

**Use REST for:**
- External webhooks (Stripe, third-party services)
- Public APIs for external consumers
- File uploads (multipart/form-data)

#### 3.1.2 tRPC Context Integration

**Context Creation** ([layers/trpc/server/trpc/context.ts](layers/trpc/server/trpc/context.ts)):

```typescript
import type { inferAsyncReturnType } from '@trpc/server'
import type { CreateNuxtContextOptions } from 'trpc-nuxt'
import { withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth/server'
import { getAmplifyAuthContext } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { getCookie, getHeader } from 'h3'
import { getUserProfile } from '~/server/services/userProfile'
import { getWorkspace } from '~/server/services/workspace'
import type { H3Event } from 'h3'

export const createContext = async (event: H3Event) => {
  const authContext = await getAmplifyAuthContext(event).then(async (context) => {
    if (!context.isAuthenticated) return context

    // Fetch user profile if authenticated
    const userProfile = await getUserProfile(context.user.userId)

    // Fetch current workspace if header/cookie present
    const workspaceId = getHeader(event, 'x-workspace-id') || getCookie(event, 'current_workspace')
    const workspace = workspaceId ? await getWorkspace(workspaceId, context.user.userId) : null

    return {
      ...context,
      userProfile,
      workspace
    }
  }).catch(() => ({
    user: null,
    session: null,
    contextSpec: null,
    isAuthenticated: false,
    userProfile: null,
    workspace: null
  }))

  return {
    event,              // H3 event for accessing request/response
    ...authContext      // Amplify authentication context + profile + workspace
  }
}

export type Context = inferAsyncReturnType<typeof createContext>
```

**Key Features**:
- Integrates Amplify authentication into every tRPC request
- Resolves `userProfile` and `workspace` for authenticated users
- Gracefully handles unauthenticated requests (for public procedures)
- Provides `contextSpec` for Amplify API calls within procedures
- Type-safe context available in all procedures

### 3.2 Procedure Types

#### 3.2.1 Public Procedure

**Definition** ([layers/trpc/server/trpc/trpc.ts](layers/trpc/server/trpc/trpc.ts)):

```typescript
export const publicProcedure = t.procedure
```

**Use Cases**:
- Public data retrieval (no authentication required)
- Health checks and status endpoints
- Public content listing
- Anonymous operations

**Example**:
```typescript
// layers/{layer-name}/server/trpc/routers/{layer-name}.ts
export const layerRouter = router({
  getPublicData: publicProcedure
    .output(z.object({
      success: z.boolean(),
      data: z.object({
        items: z.array(ItemSchema),
        count: z.number()
      })
    }))
    .query(async ({ ctx }) => {
      return await withAmplifyPublic(async (contextSpec) => {
        const client = generateClient<Schema>({ authMode: 'apiKey' })
        const { data: items } = await client.models.SomeModel.list(contextSpec)

        return {
          success: true,
          data: {
            items: items.map(transform),
            count: items.length
          }
        }
      })
    })
})
```

#### 3.2.2 Protected Procedure

**Definition** ([layers/trpc/server/trpc/trpc.ts](layers/trpc/server/trpc/trpc.ts:39-71)):

```typescript
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.isAuthenticated || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,      // TypeScript knows user is non-null here
      session: ctx.session,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthenticated)
```

**Use Cases**:
- User-specific data operations
- Creating user-owned resources
- Modifying authenticated user data
- Operations requiring user identity

**Example**:
```typescript
// layers/{layer-name}/server/trpc/routers/{layer-name}.ts
export const layerRouter = router({
  createResource: protectedProcedure
    .input(z.object({
      fieldA: z.string().min(1),
      fieldB: z.number().positive(),
      fieldC: z.enum(['option1', 'option2'])
    }))
    .output(z.object({
      success: z.boolean(),
      data: z.object({
        id: z.string(),
        createdAt: z.date()
      })
    }))
    .mutation(async ({ input, ctx }) => {
      // ctx.user is guaranteed to exist (TypeScript enforced)
      const userId = ctx.session.tokens?.idToken?.payload?.sub

      return await withAmplifyAuth(ctx.event, async (contextSpec) => {
        // Business logic with Amplify
        const client = generateClient<Schema>({ authMode: 'userPool' })
        // ... implementation
      })
    })
})
```

#### 3.2.3 Role-Based Procedures (Future)

**Pattern for Admin/Role-Based Access**:

```typescript
// server/trpc/trpc.ts
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.isAuthenticated || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Check admin role from Cognito groups or custom attribute
  const groups = ctx.session.tokens?.accessToken?.payload?.['cognito:groups'] || []
  if (!groups.includes('Admin')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required'
    })
  }

  return next({ ctx })
})

export const adminProcedure = t.procedure
  .use(isAuthenticated)
  .use(isAdmin)
```

### 3.3 Router Organization

#### 3.3.1 Router Structure

```
server/trpc/routers/
├── index.ts                    # Main app router (combines all routers)
├── billing.ts                  # Billing and subscription procedures
├── analytics.ts                # Analytics and metrics procedures
├── admin.ts                    # Admin-only procedures
└── shared/
    ├── schemas.ts              # Reusable Zod schemas
    └── utils.ts                # Shared utility functions
```

#### 3.3.2 Main Router

**File**: `server/trpc/routers/index.ts`

```typescript
import { router } from '../trpc'
import { exampleRouter } from './example'
import { billingRouter } from './billing'
import { analyticsRouter } from './analytics'
import { adminRouter } from './admin'

export const appRouter = router({
  example: exampleRouter,      // Remove after implementing real routers
  billing: billingRouter,       // Stripe integration
  analytics: analyticsRouter,   // Dashboard metrics
  admin: adminRouter,           // Admin operations
})

export type AppRouter = typeof appRouter
```

**Usage from Client**:
```typescript
// Automatic type inference for all procedures
$trpc.billing.createCheckout.mutate({ ... })
$trpc.analytics.getDashboardMetrics.useQuery()
$trpc.admin.listUsers.useQuery({ ... })
```

#### 3.3.3 Naming Conventions

**Procedure Naming Pattern**: `<verb><Noun>`

**Queries (Read Operations)**:
- `get<Resource>` - Get single resource by ID
- `list<Resources>` - List multiple resources with pagination
- `search<Resources>` - Search with filters
- `count<Resources>` - Count resources

**Mutations (Write Operations)**:
- `create<Resource>` - Create new resource
- `update<Resource>` - Update existing resource
- `delete<Resource>` - Delete resource
- `<action><Resource>` - Custom action (e.g., `sendInvitation`, `approveRequest`)

**Examples**:
```typescript
router({
  // Queries
  getSubscription: protectedProcedure...,
  listInvoices: protectedProcedure...,
  searchUsers: adminProcedure...,

  // Mutations
  createCheckout: protectedProcedure...,
  updateProfile: protectedProcedure...,
  cancelSubscription: protectedProcedure...,
  sendInvitation: protectedProcedure...,
})
```

### 3.4 Validation Schemas

#### 3.4.1 Shared Schemas

**File**: `server/trpc/routers/shared/schemas.ts`

```typescript
import { z } from 'zod'

// Pagination
export const PaginationInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
})

export const PaginationOutputSchema = z.object({
  total: z.number(),
  pages: z.number(),
  page: z.number(),
  limit: z.number(),
})

// Common entities
export const UserIdSchema = z.string().uuid()

export const EmailSchema = z.string().email()

export const PhoneSchema = z.string().regex(
  /^\+[1-9]\d{1,14}$/,
  'Phone must be in E.164 format (+1234567890)'
)

// Billing
export const BillingIntervalSchema = z.enum(['month', 'year'])

export const PlanIdSchema = z.string().min(1)

export const PriceIdSchema = z.string().regex(
  /^price_[a-zA-Z0-9]+$/,
  'Invalid Stripe price ID format'
)

// Standard response wrappers
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
  })

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
})
```

**Usage**:
```typescript
import { PaginationInputSchema, SuccessResponseSchema } from './shared/schemas'

router({
  listInvoices: protectedProcedure
    .input(PaginationInputSchema)
    .output(SuccessResponseSchema(z.array(InvoiceSchema)))
    .query(async ({ input, ctx }) => {
      // input.page and input.limit are validated
    })
})
```

#### 3.4.2 Custom Validation Rules

**Complex Validation Examples**:

```typescript
// Conditional validation
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['user', 'admin']),
  adminNote: z.string().optional(),
}).refine(
  (data) => data.role !== 'admin' || data.adminNote,
  {
    message: 'Admin note is required when creating admin users',
    path: ['adminNote'],
  }
)

// Cross-field validation
const DateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)

// Array validation with limits
const BulkOperationSchema = z.object({
  userIds: z.array(z.string().uuid())
    .min(1, 'At least one user required')
    .max(100, 'Maximum 100 users per batch'),
  action: z.enum(['suspend', 'activate', 'delete']),
})
```

### 3.5 Client Usage Patterns

#### 3.5.1 Basic Queries and Mutations

**In Vue Components**:

```vue
<script setup lang="ts">
// Query: Fetch subscription data
const { data: subscription, pending, error, refresh } =
  await $trpc.billing.getSubscription.useQuery()

// Mutation: Create checkout
const createCheckout = $trpc.billing.createCheckout.useMutation()

const handleSubscribe = async (priceId: string) => {
  try {
    const result = await createCheckout.mutate({
      priceId,
      planId: 'pro',
      billingInterval: 'month'
    })

    // result is fully typed: { success: boolean, data: { url: string, sessionId: string } }
    navigateTo(result.data.url, { external: true })
  } catch (error) {
    // error is TRPCClientError with structured error data
    console.error('Checkout failed:', error.message)
  }
}
</script>

<template>
  <div>
    <!-- Automatic loading/error states -->
    <div v-if="pending">Loading subscription...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <h2>Current Plan: {{ subscription?.data.plan.name }}</h2>
      <UButton @click="handleSubscribe('price_xxx')">
        Upgrade to Pro
      </UButton>
    </div>
  </div>
</template>
```

#### 3.5.2 Composable Pattern (Layer Abstraction)

**Pattern**: Layers should update their existing composables to use tRPC internally. The consumer should not know or care about the underlying protocol.

**Example - Layer composable using tRPC internally**:

```typescript
// layers/{layer-name}/composables/useLayer.ts
export const useLayer = () => {
  // Internally uses tRPC (transparent to consumer)
  const {
    data: resource,
    pending: loading,
    error,
    refresh,
  } = $trpc.layer.getResource.useQuery()

  const mutation = $trpc.layer.updateResource.useMutation({
    onSuccess: () => refresh()
  })

  const updateResource = async (data: UpdateData) => {
    return await mutation.mutate(data)
  }

  return {
    resource,
    loading,
    error,
    updateResource,
    refresh,
  }
}
```

**Usage in Component** (consumer doesn't know about tRPC):

```vue
<script setup lang="ts">
// Consumer uses the layer composable, not $trpc directly
const { resource, loading, updateResource } = useLayer()

const handleUpdate = async () => {
  await updateResource({ field: 'value' })
}
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else>{{ resource?.name }}</div>
</template>
```

**Key Principle**:
- ✅ `useLayer()` abstracts the protocol (tRPC, REST, GraphQL)
- ✅ Consumers only import and use `useLayer()`
- ✅ Internal implementation can change without breaking consumers

#### 3.5.3 Server-Side Usage (SSR)

**In Server Routes or Middleware**:

```typescript
// server/api/admin/dashboard.get.ts
export default defineEventHandler(async (event) => {
  // Create tRPC caller for server-side usage
  const ctx = await createContext({ event })
  const caller = appRouter.createCaller(ctx)

  try {
    // Call tRPC procedures server-side
    const metrics = await caller.analytics.getDashboardMetrics({
      timeRange: '30d'
    })

    return metrics
  } catch (error) {
    if (error instanceof TRPCError) {
      throw createError({
        statusCode: error.code === 'UNAUTHORIZED' ? 401 : 500,
        message: error.message,
      })
    }
    throw error
  }
})
```

### 3.6 Error Handling

#### 3.6.1 Server-Side Error Handling

**Throwing Errors in Procedures**:

```typescript
import { TRPCError } from '@trpc/server'

export const billingRouter = router({
  createCheckout: protectedProcedure
    .input(CheckoutInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Business logic
        const session = await stripe.checkout.sessions.create({ ... })
        return { success: true, data: { url: session.url } }

      } catch (error) {
        // Log for debugging
        console.error('Checkout creation failed:', error)

        // Stripe-specific errors
        if (error instanceof Stripe.errors.StripeError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Payment processing failed',
            cause: error,
          })
        }

        // Generic errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session',
          cause: error,
        })
      }
    })
})
```

**Standard Error Codes**:
- `UNAUTHORIZED` (401) - Not authenticated
- `FORBIDDEN` (403) - Not authorized for resource
- `NOT_FOUND` (404) - Resource doesn't exist
- `BAD_REQUEST` (400) - Invalid input or business logic error
- `CONFLICT` (409) - Resource conflict (e.g., duplicate)
- `INTERNAL_SERVER_ERROR` (500) - Unexpected server error
- `TIMEOUT` (408) - Operation timed out

#### 3.6.2 Client-Side Error Handling

**In Components**:

```vue
<script setup lang="ts">
import { TRPCClientError } from '@trpc/client'

const mutation = $trpc.billing.createCheckout.useMutation()

const handleAction = async () => {
  try {
    await mutation.mutate({ ... })
  } catch (error) {
    if (error instanceof TRPCClientError) {
      // Structured error from tRPC
      if (error.data?.code === 'UNAUTHORIZED') {
        // Redirect to login
        navigateTo('/auth/login')
      } else if (error.data?.code === 'BAD_REQUEST') {
        // Show user-friendly error
        toast.error(error.message)
      } else {
        // Generic error
        toast.error('Something went wrong. Please try again.')
      }
    } else {
      // Network or unexpected error
      toast.error('Network error. Please check your connection.')
    }
  }
}
</script>
```

**Global Error Handler**:

```typescript
// plugins/trpc-error-handler.ts
export default defineNuxtPlugin(() => {
  const toast = useToast()
  const router = useRouter()

  // Global error handling
  return {
    provide: {
      handleTrpcError: (error: unknown) => {
        if (error instanceof TRPCClientError) {
          switch (error.data?.code) {
            case 'UNAUTHORIZED':
              router.push('/auth/login')
              toast.error('Please log in to continue')
              break
            case 'FORBIDDEN':
              toast.error('You do not have permission for this action')
              break
            case 'NOT_FOUND':
              toast.error('Resource not found')
              break
            default:
              toast.error(error.message || 'An error occurred')
          }
        } else {
          toast.error('Network error. Please try again.')
        }
      }
    }
  }
})
```


## 4. Testing

### 4.1 Procedure Testing

#### 4.1.1 Unit Testing Procedures

**Test Structure**:

```typescript
// tests/trpc/billing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appRouter } from '~/server/trpc/routers'
import type { Context } from '~/server/trpc/context'

// Mock context helpers
const createMockContext = (overrides?: Partial<Context>): Context => ({
  event: {} as any,
  user: null,
  session: null,
  contextSpec: null,
  isAuthenticated: false,
  ...overrides,
})

const createAuthenticatedContext = (): Context => ({
  event: {} as any,
  user: { userId: 'test-user-id', username: 'test-user' },
  session: { tokens: { idToken: { payload: { sub: 'test-user-id' } } } },
  contextSpec: {} as any,
  isAuthenticated: true,
})

describe('Billing Router', () => {
  describe('plans (public)', () => {
    it('should return subscription plans without authentication', async () => {
      const ctx = createMockContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.billing.plans()

      expect(result.success).toBe(true)
      expect(result.data.plans).toBeInstanceOf(Array)
      expect(result.data.count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('createCheckout (protected)', () => {
    it('should require authentication', async () => {
      const ctx = createMockContext()
      const caller = appRouter.createCaller(ctx)

      await expect(
        caller.billing.createCheckout({
          priceId: 'price_123',
          planId: 'pro',
          billingInterval: 'month',
        })
      ).rejects.toThrow('UNAUTHORIZED')
    })

    it('should validate input schema', async () => {
      const ctx = createAuthenticatedContext()
      const caller = appRouter.createCaller(ctx)

      await expect(
        caller.billing.createCheckout({
          priceId: 'price_123',
          planId: 'pro',
          billingInterval: 'invalid' as any, // Invalid enum value
        })
      ).rejects.toThrow() // Zod validation error
    })

    it('should create checkout session for authenticated user', async () => {
      const ctx = createAuthenticatedContext()
      const caller = appRouter.createCaller(ctx)

      // Mock Stripe and Amplify calls
      vi.mock('stripe', () => ({ ... }))

      const result = await caller.billing.createCheckout({
        priceId: 'price_123',
        planId: 'pro',
        billingInterval: 'month',
      })

      expect(result.success).toBe(true)
      expect(result.data.url).toMatch(/^https:\/\/checkout\.stripe\.com/)
      expect(result.data.sessionId).toBeDefined()
    })
  })
})
```

#### 4.1.2 Integration Testing

**Test with Real Amplify Context**:

```typescript
// tests/integration/billing-flow.test.ts
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'

describe('Billing Flow (Integration)', () => {
  await setup({
    // Configure test environment
  })

  it('should complete full checkout flow', async () => {
    // 1. Create authenticated session
    const authResponse = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'test123' }
    })

    // 2. Call tRPC endpoint via HTTP
    const checkoutResponse = await $fetch('/api/trpc/billing.createCheckout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResponse.token}`
      },
      body: JSON.stringify({
        priceId: 'price_test_123',
        planId: 'pro',
        billingInterval: 'month'
      })
    })

    expect(checkoutResponse.result.data.success).toBe(true)
    expect(checkoutResponse.result.data.data.url).toBeDefined()
  })
})
```

### 4.2 Client-Side Testing

**Testing tRPC Composables**:

```typescript
// tests/composables/useBillingTrpc.test.ts
import { describe, it, expect, vi } from 'vitest'
import { useBillingTrpc } from '~/composables/useBillingTrpc'

describe('useBillingTrpc', () => {
  it('should fetch subscription data', async () => {
    // Mock tRPC client
    vi.mock('$trpc', () => ({
      billing: {
        getSubscription: {
          useQuery: vi.fn(() => ({
            data: ref({ success: true, data: { ... } }),
            pending: ref(false),
            error: ref(null),
          }))
        }
      }
    }))

    const { subscription, subscriptionLoading } = useBillingTrpc()

    expect(subscriptionLoading.value).toBe(false)
    expect(subscription.value?.success).toBe(true)
  })
})
```


## 5. Implementation

### 5.1 Layer Structure

Complete directory structure for the tRPC infrastructure layer:

```
layers/trpc/
├── server/
│   ├── trpc/
│   │   ├── context.ts                # Request context with Amplify auth
│   │   ├── trpc.ts                   # tRPC instance and procedures
│   │   └── routers/
│   │       ├── index.ts              # Main router (aggregates all layers)
│   │       └── example.ts            # Example procedures
│   └── api/
│       └── trpc/
│           └── [trpc].ts             # Nuxt API handler
├── plugins/
│   └── client.ts                     # tRPC client plugin
├── types/
│   └── index.ts                      # Type exports (AppRouter)
├── nuxt.config.ts                    # Layer configuration
├── package.json                      # Dependencies (@trpc/client, @trpc/server, trpc-nuxt, zod)
└── README.md                         # Usage guide and patterns
```

**Layer-Specific Routers** (implemented by other layers):
```
layers/{layer-name}/
└── server/trpc/routers/
    └── {layer-name}.ts               # Layer-specific procedures
```

### 5.2 Definition of Done

**Infrastructure Acceptance Criteria**

- [ ] tRPC context integrates with Amplify authentication
- [ ] Public procedure allows unauthenticated access
- [ ] Protected procedure enforces authentication
- [ ] tRPC client plugin is available in all components
- [ ] Type inference works from server to client
- [ ] Error handling with TRPCError is implemented
- [ ] Example router demonstrates patterns
- [ ] Main router aggregates layer routers correctly
- [ ] Documentation in README.md is complete

**Layer Integration Criteria** (for layers implementing tRPC):

- [ ] Layer router file created in layer's server/trpc/routers/
- [ ] Router imported and registered in main appRouter
- [ ] Procedures use appropriate procedure type (public/protected)
- [ ] Input/output validation with Zod schemas
- [ ] Layer composables updated to use tRPC internally
- [ ] Tests added for layer procedures
- [ ] Layer PRD documents tRPC usage

### 5.3 Plan
See [tRPC Implementation Plan](../plan/trpc.md).



### 5.4 Migration Strategy (REST → tRPC)

#### Step 1: Identify Migration Candidates

**Good Candidates**:
- ✅ Complex business logic endpoints
- ✅ Endpoints with multiple parameters
- ✅ Operations requiring input validation
- ✅ Internal API endpoints (not external webhooks)

**Keep as REST**:
- ❌ External webhooks (Stripe, etc.)
- ❌ Simple public endpoints
- ❌ File uploads (better handled by REST)

#### Step 2: Create tRPC Procedure

**Original REST Endpoint** (`/api/billing/checkout.post.ts`):

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { priceId, planId, billingInterval } = body

  // Manual validation
  if (!priceId || !planId || !billingInterval) {
    throw createError({ statusCode: 400, message: 'Missing parameters' })
  }

  // Business logic...
})
```

**Migrated tRPC Procedure**:

```typescript
// server/trpc/routers/billing.ts
export const billingRouter = router({
  createCheckout: protectedProcedure
    .input(z.object({
      priceId: z.string().min(1),
      planId: z.string().min(1),
      billingInterval: z.enum(['month', 'year'])
    }))
    .output(z.object({
      success: z.boolean(),
      data: z.object({
        url: z.string().url(),
        sessionId: z.string()
      })
    }))
    .mutation(async ({ input, ctx }) => {
      // Same business logic, but with validated input
      // input is fully typed and validated
    })
})
```

#### Step 3: Update Client Usage

**Original $fetch**:

```typescript
const createCheckout = async (priceId: string, planId: string, interval: string) => {
  const response = await $fetch('/api/billing/checkout', {
    method: 'POST',
    body: { priceId, planId, billingInterval: interval }
  })
  return response
}
```

**Migrated tRPC**:

```typescript
const createCheckout = async (priceId: string, planId: string, interval: 'month' | 'year') => {
  const response = await $trpc.billing.createCheckout.mutate({
    priceId,
    planId,
    billingInterval: interval // TypeScript enforces enum
  })
  return response // Fully typed response
}
```

#### Step 4: Gradual Rollout

1. **Week 1**: Implement tRPC procedure alongside existing REST endpoint
2. **Week 2**: Update client to use tRPC, keep REST as fallback
3. **Week 3**: Monitor for issues, gather feedback
4. **Week 4**: Remove REST endpoint if no issues

### 5.5 Development Workflow

#### Adding New Procedure

**Checklist**:
1. ✅ Define Zod input/output schemas in `shared/schemas.ts`
2. ✅ Create procedure in appropriate router file
3. ✅ Add procedure to router in `routers/index.ts`
4. ✅ Write unit tests for procedure
5. ✅ Create/update composable for client usage
6. ✅ Document usage in README or PRD
7. ✅ Test end-to-end in development

**Example**:

```bash
# 1. Add schema
# Edit: server/trpc/routers/shared/schemas.ts

# 2. Create procedure
# Edit: server/trpc/routers/billing.ts

# 3. Test
pnpm test tests/trpc/billing.test.ts

# 4. Create composable
# Edit: composables/useBillingTrpc.ts

# 5. Test in app
pnpm dev
```
