# Error Handling Pattern

## Context
Consistent error handling is crucial for a good developer experience (debugging) and user experience (clear feedback). We need a standardized way to throw errors on the server and handle them on the client.

## Pattern Description

### 1. Server-Side Errors
We use Nuxt's `createError` (which wraps H3Error) to throw errors from API endpoints.

#### Structure
Every error should have:
- `statusCode`: Standard HTTP status code (400, 401, 403, 404, 500).
- `statusMessage`: Short, canonical HTTP status message (e.g., "Bad Request").
- `message`: A human-readable description of what went wrong.
- `data`: Optional object containing machine-readable error codes or validation details.

#### Standard Error Codes (in `data.code`)
Use these codes in `data.code` to allow the client to react programmatically (e.g., showing a specific modal).

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed (Zod). `data.issues` contains details. |
| `UNAUTHORIZED` | 401 | User is not logged in. |
| `FORBIDDEN` | 403 | User is logged in but lacks permission. |
| `NOT_FOUND` | 404 | Resource does not exist. |
| `CONFLICT` | 409 | Resource already exists or state conflict. |
| `INTERNAL_ERROR` | 500 | Unhandled server exception. |

#### Example: Throwing an Error
```typescript
// server/api/workspaces/index.post.ts
if (!isOwner) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    message: 'You are not allowed to create a workspace',
    data: {
      code: 'FORBIDDEN',
      details: { requiredRole: 'OWNER' }
    }
  })
}
```

### 2. Client-Side Handling
The client should consume these errors and display appropriate feedback.

#### Global Error Handling (Optional)
For unhandled errors, Nuxt's `app.vue` or a global error boundary can catch them.

#### Composable Usage
When using `useFetch` or `$fetch`, catch the error and parse it.

```typescript
// composables/useWorkspaces.ts
try {
  await $fetch('/api/workspaces', ...)
} catch (error: any) {
  // error.data contains the server response body
  const code = error.data?.data?.code
  const message = error.data?.message || 'Unknown error'

  if (code === 'VALIDATION_ERROR') {
    // Handle form errors
  } else {
    toast.add({ title: 'Error', description: message, color: 'red' })
  }
}
```

## Implementation Rules
1.  **Always use `createError`** on the server. Never throw raw `Error` objects from API handlers.
2.  **Sanitize 500 errors**: Ensure sensitive stack traces are not leaked to the client in production (Nuxt does this by default, but be careful with custom error handlers).
3.  **Log on Server**: Always `console.error` 500-level errors on the server for observability.
4.  **User-Friendly Messages**: The `message` field should be safe to display to the user (except for 500s, where a generic message is preferred).
