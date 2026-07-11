# Error Handling

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/patterns/error-handling.pattern.md

Mandatory pattern for all Nitro API routes and client-side consumers. Server errors are thrown with Nuxt's `createError` (H3Error); clients parse the serialized body and give user feedback via toast.

## Server-side: throwing errors

Every API error MUST be thrown with `createError` — never a raw `Error` (a non-H3Error escaping a handler becomes an opaque 500).

| Field | Required | Content |
|---|---|---|
| `statusCode` | yes | HTTP status (400, 401, 403, 404, 409, 500, 501) |
| `statusMessage` | yes | Canonical short status, e.g. `'Forbidden'` |
| `message` | yes | Human-readable, safe to show to the user (generic for 500s) |
| `data` | optional | Machine-readable payload: `code` from the taxonomy below, plus details |

### `data.code` taxonomy (the standard)

Clients react programmatically to `data.code`, never to message strings.

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed. `data.issues` carries Zod issues when applicable. |
| `UNAUTHORIZED` | 401 | No valid session. |
| `FORBIDDEN` | 403 | Authenticated but lacks permission. |
| `NOT_FOUND` | 404 | Resource does not exist. |
| `CONFLICT` | 409 | Resource already exists / state conflict. |
| `INTERNAL_ERROR` | 500 | Unhandled server exception. |

Real example (verified) — `layers/workspaces/server/api/workspaces/[id]/members/invite.post.ts`:

```typescript
if (!workspaceId) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Bad Request',
    message: 'Workspace ID is required',
    data: { code: 'VALIDATION_ERROR' }
  })
}
```

Auth guards throw without `data.code` today (see [Current status](#current-status--adoption)) — e.g. `layers/auth/server/utils/auth.ts` (`requireAuth`, 401) and `layers/entitlements/server/utils/requirePermission.ts` (403 with `data: { requiredPermission, userRole }`).

## Client-side: consuming errors

`$fetch`/`useFetch` reject with the parsed H3 body on `error.data`, so:

- server `message` → `error.data?.message`
- taxonomy code → `error.data?.data?.code`

Real example (verified) — `layers/billing/composables/useBilling.ts`:

```typescript
} catch (error: any) {
  console.error('Portal error:', error)
  useToast().add({
    title: 'Portal Error',
    description: error.data?.message || error.message || 'Failed to open billing portal',
    color: 'error'   // Nuxt UI v4 semantic color — not 'red'
  })
}
```

Branch on the code when the client must react specifically:

```typescript
const code = error.data?.data?.code
if (code === 'VALIDATION_ERROR') {
  // map error.data.data.issues onto the form
} else {
  useToast().add({ title: 'Error', description: error.data?.message ?? 'Unknown error', color: 'error' })
}
```

## Rules

1. **Always `createError`** in server handlers, middleware, and server utils. Never throw raw `Error` from an API route.
2. **Zod validation must not leak `ZodError`.** Use `readValidatedBody`/`safeParse` and rethrow as 400 + `data.code: 'VALIDATION_ERROR'` (+ `data.issues`). A raw `schema.parse()` produces a generic 500 on invalid input, breaking this contract.
3. **Sanitize 500s.** Nuxt strips stack traces in production by default; keep it that way in custom error handling, and keep 500 `message`s generic.
4. **Log 500-level errors server-side** (`console.error`) for observability — e.g. `layers/billing/server/api/billing/plans.get.ts` logs, then rethrows via `createError({ statusCode: error.statusCode || 500, ... })`. Centralized error capture is roadmap work (epic E10 in [../roadmaps/20260711-saas-boilerplate-productization.md](../roadmaps/20260711-saas-boilerplate-productization.md)).
5. **`message` is user-facing.** Write it so the client can display it verbatim (except 500s).
6. **Re-throw H3Errors unchanged** when wrapping (`if (error instanceof H3Error) throw error`) so status codes survive catch-all blocks — see `layers/workspaces/server/middleware/auth.ts`.

## Current status — adoption

The taxonomy is the standard for new code, but adoption is pending (tech debt):

- **`data.code` is applied in only 3 files**, all `VALIDATION_ERROR` for missing route params: `layers/workspaces/server/api/workspaces/[id]/members/invite.post.ts`, `.../members/[userId].delete.ts`, `.../members/[userId]/role.patch.ts`. No route emits `UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/`INTERNAL_ERROR` codes, and `data.issues` is never populated.
- **No client code branches on `data.code` today** — composables read only `error.data?.message` (verified by grep across `layers/` and `apps/`).
- **Rule 2 is violated in 4 workspace routes** that call `schema.parse()` raw (`layers/workspaces/server/api/workspaces/index.post.ts`, `[id]/index.put.ts`, `[id]/members/invite.post.ts`, `[id]/members/[userId]/role.patch.ts`): an invalid body currently returns a 500 instead of the documented 400 `VALIDATION_ERROR`.
- **Billing routes** (`layers/billing/server/api/billing/checkout.post.ts`, `portal.post.ts`) validate by hand with `typeof` checks and throw bare `statusCode`/`statusMessage` without `data.code`.
- Deliberate use of **501** for a not-yet-supported write path: `layers/auth/server/api/profile.put.ts` fails closed with an honest message — the preferred shape for unimplemented endpoints.
- There is **no global client error boundary** (`error.vue` / `vue:error` hooks); that is part of roadmap epic E10.
