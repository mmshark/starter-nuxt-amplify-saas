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

### Example
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
