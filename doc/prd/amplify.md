# PRD: Amplify Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Architecture Pattern](#31-architecture-pattern)
  - [3.2 Plugins](#32-plugins)
  - [3.3 Server Utilities](#33-server-utilities)
  - [3.4 Storage Operations](#34-storage-operations)
- [4. Testing](#4-testing)
  - [4.1 Plugin Testing](#41-plugin-testing)
  - [4.2 Integration Testing](#42-integration-testing)
- [5. Implementation](#5-implementation)
  - [5.1 Layer Structure](#51-layer-structure)
  - [5.2 Definition of Done](#52-definition-of-done)
  - [5.3 Plan](#53-plan)
- [6. Non-Functional Requirements](#6-non-functional-requirements)

## 1. Overview

### 1.1 Purpose

The Amplify Layer provides complete AWS Amplify Gen2 integration for Nuxt 4 applications, offering a seamless bridge between Nuxt's universal rendering and AWS services. It abstracts Amplify SDK complexity while providing type-safe, SSR-compatible access to GraphQL APIs, authentication, and storage services.

### 1.2 Scope

**Includes**:
- Amplify configuration plugins for client and server
- Type-safe GraphQL client with auto-generated operations
- SSR-compatible authentication context management
- S3 Storage upload/download utilities
- Server-side utilities for Nitro API routes
- Auto-generated TypeScript types from backend schema
- Universal composables for data access patterns

**Excludes**:
- Authentication flows (handled by Auth Layer)
- Business logic operations (use Layer-specific composables)
- Custom GraphQL query composition (use auto-generated operations)
- Backend infrastructure definition (handled by Backend app)

> [!NOTE]
> The GraphQL schemas shown in these PRDs are specification examples. The backend implementation does not yet exist and must be created following these specifications.

### 1.3 Key Requirements

**Technical**:
- Full TypeScript type safety from backend schema to frontend
- SSR-compatible implementation for Nuxt 4 universal rendering
- Cookie-based authentication for server-side operations
- Automatic schema updates via code generation
- Support for multiple auth modes (userPool, apiKey, iam)
- Zero-config plugin registration via Nuxt layers

**Functional**:
- Seamless GraphQL data access in components, pages, and API routes
- File upload/download with S3 integration
- Authentication context propagation across client/server boundary
- Type-safe data model operations with filters and pagination
- Real-time subscription support (GraphQL subscriptions)

### 1.4 Artifacts

**Plugins**:
- `plugins/01.amplify.client.ts` - Client-side Amplify initialization with SSR support
- `plugins/01.amplify.server.ts` - Server-side Amplify configuration for Nuxt context

**Server Utilities**:
- `server/utils/amplify.ts` - Nitro API route helpers (`withAmplifyAuth`, `withAmplifyPublic`)

**Generated Code** (auto-updated from backend schema):
- `utils/graphql/API.ts` - Complete TypeScript type definitions
- `utils/graphql/queries.ts` - All GraphQL query operations
- `utils/graphql/mutations.ts` - All GraphQL mutation operations
- `utils/graphql/subscriptions.ts` - Real-time subscription operations

**Configuration**:
- `amplify_outputs.json` - Auto-generated Amplify configuration (auto-generated from the backend)
- `nuxt.config.ts` - Layer configuration and auto-imports


## 2. User Flows

The Amplify layer provides infrastructure only and does not implement user-facing flows. User flows for data operations are defined in the PRDs of layers that consume Amplify services (e.g., Auth Layer, Billing Layer).


## 3. Technical Specifications

### 3.1 Architecture Pattern

#### 3.1.1 Three-Context Architecture

The Amplify layer supports three distinct execution contexts with unified API:

```
┌─────────────────────────────────────────────────────────────┐
│                   Nuxt Application                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐     │
│  │   Browser   │    │  SSR Pages  │    │ Nitro Routes │     │
│  │   Context   │    │   Context   │    │   Context    │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬───────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Amplify Layer Abstraction                │       │
│  ├──────────────────────────────────────────────────┤       │
│  │  • Client Plugin      • Server Plugin            │       │
│  │  • $Amplify global    • server/utils/amplify.ts  │       │
│  └──────────────┬───────────────────────────────────┘       │
│                 │                                           │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │   AWS Amplify      │
         │   Gen2 Services    │
         ├────────────────────┤
         │ • AppSync GraphQL  │
         │ • Cognito Auth     │
         │ • S3 Storage       │
         │ • DynamoDB         │
         └────────────────────┘
```

**Data Isolation Strategy**:
- **Multi-Tenancy**: Data is isolated by `workspaceId`.
- **Access Control**: AppSync resolvers validate `workspaceId` against user's membership and permissions.

**Context Usage Patterns**:

1. **Browser Context**: Client-side data fetching, mutations, file uploads
2. **SSR Context**: Server-rendered pages with authenticated data
3. **Nitro Context**: API routes for server endpoints and webhooks

#### 3.1.2 Authentication Context Propagation

```typescript
// Client → SSR boundary (automatic via cookies)
Browser: JWT tokens in localStorage + HTTP-only cookies
   ↓
SSR: Amplify reads cookies via Nuxt context
   ↓
Render: Page rendered with user-specific data

// SSR → Nitro boundary (explicit via utilities)
SSR Page: User authenticated, needs API call
   ↓
API Route: withAmplifyAuth(event, ...) extracts JWT from cookies
   ↓
Execute: GraphQL operations with user context
```

### 3.2 Plugins

#### 3.2.1 Client Plugin (`01.amplify.client.ts`)

**Purpose**: Initialize Amplify SDK in browser with SSR support and provide global Nuxt plugin access.

**Configuration**:
```typescript
Amplify.configure(outputs, { ssr: true })
```

**Provides**:
```typescript
interface AmplifyPlugin {
  $Amplify: {
    Auth: typeof import('aws-amplify/auth'),
    Data: {
      client: ReturnType<typeof generateClient<Schema>>
    },
    Storage: {
      uploadData: typeof uploadData,
      getUrl: typeof getUrl
    }
  }
}
```

**Features**:
- SSR-safe configuration with hydration support
- User pool authentication by default
- Type-safe data client with full schema inference
- Storage operations for S3 file management

**Usage Example**:
```vue
<script setup>
const { $Amplify } = useNuxtApp()

// Data operations
const { data: profile } = await $Amplify.Data.client.models.UserProfile.get({
  userId: 'user-123'
})

// File upload
const result = await $Amplify.Storage.uploadData({
  path: 'uploads/file.pdf',
  data: file
})
</script>
```

#### 3.2.2 Server Plugin (`01.amplify.server.ts`)

**Purpose**: Configure Amplify for server-side operations within Nuxt application context (SSR).

**Provides**:
- Cookie-based authentication via `runWithAmplifyServerContext`
- Server-side GraphQL client access
- SSR-safe authentication context

**Features**:
- Automatic cookie extraction for authentication
- Per-request context isolation
- Compatible with Nuxt `useNuxtApp()` in SSR
- **Cookie Storage Adapter**: Implements `createKeyValueStorageFromCookieStorageAdapter` to sync tokens between server (Nuxt) and client (Amplify).

**Usage Example**:
```vue
<script setup lang="ts">
// Runs on server during SSR
const { $Amplify } = useNuxtApp()

const { data: plans } = await $Amplify.Data.client.models.SubscriptionPlan.list({
  filter: { isActive: { eq: true } }
})
</script>
```

### 3.3 Server Utilities

#### 3.3.1 `withAmplifyAuth(event, callback)`

**Purpose**: Execute authenticated GraphQL operations in Nitro API routes.

**Signature**:
```typescript
withAmplifyAuth<T>(
  event: H3Event,
  callback: (contextSpec: AmplifyServerContextSpec) => Promise<T> | T
): Promise<T>
```

**Behavior**:
- Extracts JWT tokens from HTTP-only cookies
- Creates Amplify server context with user authentication
- Provides `contextSpec` for authenticated GraphQL operations
- Throws error if user is not authenticated
- Automatically manages context lifecycle
- **Implementation Detail**: Uses `createKeyValueStorageFromCookieStorageAdapter` with `h3` event cookies to recreate the user's session on the server.

**Auth Mode**: `userPool` (requires authenticated user)

**Usage**:
```typescript
// server/api/profile.get.ts
export default defineEventHandler(async (event) => {
  return await withAmplifyAuth(event, async (contextSpec) => {
    const client = generateClient<Schema>({ authMode: 'userPool' })

    const { data: profile } = await client.models.UserProfile.get(
      contextSpec,
      { userId: 'user-123' }
    )

    return { profile }
  })
})
```

#### 3.3.2 `withAmplifyPublic(callback)`

**Purpose**: Execute public GraphQL operations without authentication.

**Signature**:
```typescript
withAmplifyPublic<T>(
  callback: (contextSpec: AmplifyServerContextSpec) => Promise<T> | T
): Promise<T>
```

**Behavior**:
- Creates Amplify server context without authentication
- Provides `contextSpec` for public GraphQL operations
- Uses API key authentication mode
- Suitable for public data access (pricing plans, public content)

**Auth Mode**: `apiKey` (public access)

**Usage**:
```typescript
// server/api/plans.get.ts
export default defineEventHandler(async (event) => {
  return await withAmplifyPublic(async (contextSpec) => {
    const client = generateClient<Schema>({ authMode: 'apiKey' })

    const { data: plans } = await client.models.SubscriptionPlan.list(contextSpec, {
      filter: { isActive: { eq: true } }
    })

    return { plans }
  })
})
```

### 3.4 Storage Operations

#### 3.6.1 File Upload

```typescript
const { $Amplify } = useNuxtApp()

const uploadFile = async (file: File) => {
  try {
    const result = await $Amplify.Storage.uploadData({
      path: `uploads/${Date.now()}-${file.name}`,
      data: file,
      options: {
        contentType: file.type,
        metadata: {
          userId: 'user-123'
        }
      }
    })

    return result
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}
```

#### 3.6.2 Get File URL

```typescript
const getFileUrl = async (filePath: string) => {
  try {
    const result = await $Amplify.Storage.getUrl({
      path: filePath,
      options: {
        expiresIn: 3600, // 1 hour
        validateObjectExistence: true
      }
    })

    return result.url
  } catch (error) {
    console.error('Failed to get file URL:', error)
    throw error
  }
}
```



## 4. Testing

### 4.1 Plugin Testing

**Scope**: Verify plugin initialization and configuration

**Test Cases**:
- Client plugin initializes Amplify with SSR support
- Server plugin provides authenticated context in SSR
- `$Amplify` is accessible via `useNuxtApp()`
- Data client is properly typed with Schema
- Storage utilities are available and configured

**Tools**: Vitest with Nuxt test utils

### 4.2 Integration Testing

No testing is required for this layer.


## 5. Implementation

### 5.1 Layer Structure

```
layers/amplify/
├── plugins/
│   ├── 01.amplify.client.ts      # Client-side initialization (SSR-safe)
│   └── 01.amplify.server.ts      # Server-side initialization (Nuxt context)
├── server/
│   └── utils/
│       └── amplify.ts             # Nitro API route utilities
├── utils/
│   └── graphql/                   # *Auto-generated GraphQL operations*
│       ├── API.ts                 # TypeScript type definitions
│       ├── queries.ts             # Query operations
│       ├── mutations.ts           # Mutation operations
│       └── subscriptions.ts       # Subscription operations
├── types/
│   └── amplify.d.ts               # TypeScript plugin type extensions
├── amplify_outputs.json           # Auto-generated Amplify config
├── nuxt.config.ts                 # Layer configuration
├── package.json                   # Package metadata
└── README.md                      # Layer documentation
```

### 5.2 Definition of Done

**Acceptance Criteria**

- [ ] Client plugin initializes Amplify with SSR support
- [ ] Server plugin provides authenticated context in SSR pages
- [ ] `withAmplifyAuth()` utility validates authentication in API routes
- [ ] `withAmplifyPublic()` utility provides public data access
- [ ] Data client provides type-safe model operations
- [ ] Storage utilities support file upload/download
- [ ] GraphQL code generation works correctly
- [ ] TypeScript types are properly exported and imported
- [ ] Error handling works for authentication failures
- [ ] Documentation explains all three execution contexts

**Interfaces**

- [ ] `$Amplify.Auth` plugin interface is implemented
- [ ] `$Amplify.Data.client` plugin interface is implemented
- [ ] `$Amplify.Storage` plugin interface is implemented
- [ ] `withAmplifyAuth()` server utility is implemented
- [ ] `withAmplifyPublic()` server utility is implemented
- [ ] Generated GraphQL types are available
- [ ] Schema type imports work correctly
- [ ] Amplify configuration is properly loaded

### 5.3 Plan

See [Amplify Implementation Plan](../plan/amplify.md).
