# Pattern: API Server Architecture

## Context
Server-side API routes (`server/api/`) provide the backend logic for the application. They need to be secure, consistent, and easy to consume.

## Problem
- **Inconsistent Responses**: Different endpoints returning different error shapes.
- **Security Gaps**: Missing authentication checks on protected routes.
- **Code Duplication**: Repeating auth logic in every handler.

## Solution
Use standardized higher-order functions (wrappers) for authentication and consistent error handling utilities.

## Pattern Details

### Auth Wrappers
Use wrappers provided by the `amplify` layer:
- `withAmplifyAuth(event, fn)`: Enforces authentication.
- `withAmplifyPublic(fn)`: Allows public access but provides auth context if available.

### Error Handling
Use `createError` from `h3` to throw standardized HTTP errors.

### Example: Authenticated Endpoint with User Context
```typescript
import { withAmplifyAuth } from '@your-org/amplify/server/utils/amplify'

export default defineEventHandler(async (event) => {
  return withAmplifyAuth(event, async (context) => {
    if (!context.user) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // Business logic
    return { success: true, data: { ... } }
  })
})
```

### Example: Public Endpoint with Amplify Data (GraphQL)
```typescript
import { getServerPublicDataClient, withAmplifyPublic } from '@your-org/amplify/server/utils/amplify'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = event.context.user // Set by auth middleware
  const body = await readBody(event)

  // Validate input
  const input = createSchema.parse(body)

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // GraphQL mutation via Amplify Data
    const { data, errors } = await client.models.Workspace.create(contextSpec, {
      name: input.name,
      description: input.description,
      ownerId: user.userId
    })

    if (errors) {
      throw createError({
        statusCode: 500,
        message: 'Failed to create resource'
      })
    }

    return data
  })
})
```

**Key Points**:
- `withAmplifyPublic` creates the Amplify server context
- `contextSpec` must be passed to all Amplify Data operations
- Zod schemas provide input validation
- GraphQL operations are type-safe via generated client
