# Pattern: API Server Architecture

## Context

Server-side API routes (`server/api/`) provide the backend logic for the application. They need to be secure, consistent, and easy to consume. This pattern defines the standard approach for all API endpoints in this project.

## Problem

Without a standard pattern:
- **Inconsistent Responses**: Different endpoints returning different error shapes
- **Security Gaps**: Missing authentication checks on protected routes
- **Code Duplication**: Repeating auth logic in every handler
- **Poor Developer Experience**: No clear conventions for API design

## Solution

Use standardized higher-order functions (wrappers) for authentication and consistent error handling utilities. All API endpoints use REST conventions with Nuxt's built-in `server/api` routing.

> **Note**: This project uses REST API endpoints exclusively. The tRPC pattern has been deprecated (see [trpc.pattern.md](trpc.pattern.md)).

## Pattern Details

### Directory Structure

```
layers/<layer>/server/
├── api/
│   └── <layer>/              # Namespaced API routes
│       ├── index.get.ts      # GET /api/<layer>
│       ├── index.post.ts     # POST /api/<layer>
│       ├── [id].get.ts       # GET /api/<layer>/:id
│       ├── [id].patch.ts     # PATCH /api/<layer>/:id
│       └── [id].delete.ts    # DELETE /api/<layer>/:id
├── middleware/               # Server middleware
│   └── auth.ts              # Authentication middleware
└── utils/                    # Server utilities
    └── <layer>.ts           # Layer-specific utilities
```

### Auth Wrappers

Use wrappers provided by the `amplify` layer:

#### `withAmplifyAuth(event, fn)`

For protected endpoints requiring authentication:

```typescript
import { withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

export default defineEventHandler(async (event) => {
  return withAmplifyAuth(event, async (context) => {
    // context.user is guaranteed to exist
    const userId = context.user.userId

    // Business logic here...
    return { success: true, data: { ... } }
  })
})
```

#### `withAmplifyPublic(fn)`

For public endpoints (no auth required):

```typescript
import { withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

export default defineEventHandler(async (event) => {
  return withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Public data access...
    return { success: true, data: { ... } }
  })
})
```

### Error Handling

Use `createError` from `h3` to throw standardized HTTP errors:

```typescript
if (!resource) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    message: 'Resource not found',
    data: {
      code: 'NOT_FOUND',
      resourceId: id
    }
  })
}
```

#### Standard Error Structure

```typescript
interface ApiError {
  statusCode: number        // HTTP status code
  statusMessage: string     // Short canonical message
  message: string          // User-friendly description
  data?: {
    code: string           // Machine-readable error code
    details?: any          // Additional context
  }
}
```

#### Standard Error Codes

| Code | HTTP Status | When to Use |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | User is not authenticated |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Input Validation

Use Zod for runtime validation:

```typescript
import { z } from 'zod'

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = CreateWorkspaceSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: {
        code: 'VALIDATION_ERROR',
        issues: result.error.issues
      }
    })
  }

  // Use result.data (validated and typed)
})
```

### Response Format

#### Success Response

```typescript
// Standard success
return {
  success: true,
  data: { ... }
}

// List response with pagination
return {
  success: true,
  data: {
    items: [...],
    pagination: {
      total: 100,
      page: 1,
      limit: 10,
      hasMore: true
    }
  }
}
```

#### Error Response (via createError)

```typescript
// Thrown errors automatically formatted by Nuxt
{
  statusCode: 400,
  statusMessage: 'Bad Request',
  message: 'Validation failed',
  data: {
    code: 'VALIDATION_ERROR',
    issues: [...]
  }
}
```

### Complete Example

```typescript
// layers/workspaces/server/api/workspaces/index.post.ts
import { z } from 'zod'
import { withAmplifyAuth, getServerUserPoolDataClient } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional()
})

export default defineEventHandler(async (event) => {
  // 1. Validate input
  const body = await readBody(event)
  const validation = CreateWorkspaceSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Invalid workspace data',
      data: {
        code: 'VALIDATION_ERROR',
        issues: validation.error.issues
      }
    })
  }

  // 2. Execute with auth context
  return withAmplifyAuth(event, async (context) => {
    const client = getServerUserPoolDataClient()
    const userId = context.user.userId

    // 3. Business logic
    const { data: workspace, errors } = await client.models.Workspace.create({
      name: validation.data.name,
      slug: validation.data.slug || generateSlug(validation.data.name),
      ownerId: userId
    })

    if (errors) {
      throw createError({
        statusCode: 500,
        message: 'Failed to create workspace',
        data: { code: 'INTERNAL_ERROR' }
      })
    }

    // 4. Return success
    return {
      success: true,
      data: { workspace }
    }
  })
})
```

## Anti-Patterns

### ❌ Don't: Raw Error Throws

```typescript
// Bad - exposes stack trace
throw new Error('Something went wrong')

// Good - structured error
throw createError({
  statusCode: 500,
  message: 'Operation failed',
  data: { code: 'INTERNAL_ERROR' }
})
```

### ❌ Don't: Skip Authentication

```typescript
// Bad - no auth check
export default defineEventHandler(async (event) => {
  const userId = getQuery(event).userId // Trusting client input!
  // ...
})

// Good - use auth wrapper
export default defineEventHandler(async (event) => {
  return withAmplifyAuth(event, async (context) => {
    const userId = context.user.userId // From verified JWT
    // ...
  })
})
```

### ❌ Don't: Return Inconsistent Shapes

```typescript
// Bad - different shapes per endpoint
return workspace          // Just data
return { workspace }      // Object
return { data: workspace } // Different key

// Good - consistent shape
return {
  success: true,
  data: { workspace }
}
```

## Testing

### Testing Protected Endpoints

```typescript
// tests/api/workspaces.test.ts
describe('POST /api/workspaces', () => {
  it('requires authentication', async () => {
    const response = await $fetch('/api/workspaces', {
      method: 'POST',
      body: { name: 'Test' }
    })

    expect(response.statusCode).toBe(401)
  })

  it('validates input', async () => {
    const response = await $fetch('/api/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: '' } // Invalid
    })

    expect(response.statusCode).toBe(400)
    expect(response.data.code).toBe('VALIDATION_ERROR')
  })
})
```

## Related Patterns

- [Composables Pattern](composables.pattern.md) - Client-side state management
- [Error Handling Pattern](error-handling.pattern.md) - Error conventions
- [Layers Pattern](layers.pattern.md) - Layer structure
