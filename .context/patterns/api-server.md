# Pattern: Server API Routes

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/patterns/api-server.pattern.md

**This pattern is mandatory** for every Nitro route (`server/api/`) in this repo. REST only — the tRPC experiment was removed (archived at `doc/archive/adr/patterns/trpc.pattern.md`).

## Directory structure

Routes live in the layer that owns the domain, namespaced under the layer name:

```
layers/<layer>/server/
├── api/<layer>/           # e.g. layers/billing/server/api/billing/
│   ├── index.get.ts       # GET  /api/<layer>
│   ├── index.post.ts      # POST /api/<layer>
│   └── [id].patch.ts      # PATCH /api/<layer>/:id
├── middleware/            # optional (workspaces has server/middleware/auth.ts)
└── utils/                 # layer-specific server utilities
```

Real inventory: 22 routes across 4 layers — auth (2), billing (5), entitlements (4), workspaces (11).

## Amplify server context (the real signatures)

All Amplify Data / Auth calls from Nitro run inside an Amplify SSR context. The wrappers live in `layers/amplify/server/utils/amplify.ts` and are imported as:

```typescript
import { withAmplifyAuth, getServerUserPoolDataClient } from '@mmshark/amplify-layer/server/utils/amplify'
```

| Utility | Signature | Purpose |
|---|---|---|
| `withAmplifyAuth` | `(event, (contextSpec) => T) => Promise<T>` | Amplify context from the request's Cognito cookies (userPool auth) |
| `withAmplifyPublic` | `((contextSpec) => T) => Promise<T>` | Sessionless context — apiKey reads only, carries no credentials |
| `getServerUserPoolDataClient` | `() => client` | Data client with `authMode: 'userPool'` |
| `getServerPublicDataClient` | `() => client` | Data client with `authMode: 'apiKey'` |
| `getAwsCredentials` | `(contextSpec) => Promise<credentials>` | Caller's identity-pool credentials for plain AWS SDK v3 clients; only valid inside `withAmplifyAuth` |

Two rules that follow from the real signatures:

1. **The callback receives an Amplify `contextSpec`, not a user object.** There is no `context.user`. To get the caller's identity, call `fetchAuthSession(contextSpec)` / `getCurrentUser(contextSpec)` / `fetchUserAttributes(contextSpec)` from `aws-amplify/auth/server`. Every Data model call takes `contextSpec` as its first argument: `client.models.X.get(contextSpec, { ... })`.
2. **`withAmplifyAuth` does not reject unauthenticated requests by itself** — it only wires cookie-based token providers. Enforce auth explicitly (next section).

There is deliberately **no IAM data client**: server routes acting for a signed-in user must use the userPool client so the caller's `cognito:groups` claim governs AppSync access. Privileged sessionless writes happen only inside dedicated Lambdas (`stripe-webhook`, `workspace-membership`, `post-confirmation`). See the note at the bottom of `layers/amplify/server/utils/amplify.ts`.

## Authentication and authorization

- **Authentication**: call `requireAuth(event)` from `layers/auth/server/utils/auth.ts`. It runs `fetchAuthSession` inside `withAmplifyAuth`, throws `401` when `session.tokens` is missing, and returns/attaches `{ userId, email }` on `event.context.user`. It is safe from any Nitro route (no `useNuxtApp()` dependency). `/api/workspaces/*` routes additionally get `layers/workspaces/server/middleware/auth.ts`, which does the same check for that path prefix.
- **Authorization**: call `requirePermission(event, permission, workspaceId?)` from `layers/entitlements/server/utils/requirePermission.ts` (throws `403`). Pass `workspaceId` explicitly whenever the route acts on a caller-supplied workspace — never trust the `currentWorkspaceId` cookie for the target of a mutation (see `layers/billing/server/api/billing/checkout.post.ts:50`).
- **Never derive identity from client input** (query/body `userId`). Identity comes from the session: `session.tokens?.idToken?.payload?.sub`.

## Canonical protected route

Condensed from the real `layers/billing/server/api/billing/checkout.post.ts`:

```typescript
import { withAmplifyAuth, getServerUserPoolDataClient } from '@mmshark/amplify-layer/server/utils/amplify'
import { requirePermission } from '@mmshark/entitlements-layer/server/utils/requirePermission'
import { fetchAuthSession } from 'aws-amplify/auth/server'

export default defineEventHandler(async (event) => {
  // 1. Validate input BEFORE entering the Amplify context
  const body = await readBody(event)
  const { workspaceId, planId } = body || {}
  if (!workspaceId || typeof workspaceId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing required parameter: workspaceId' })
  }

  // 2. Authorize against the workspace actually being acted on
  await requirePermission(event, 'manage-billing', workspaceId)

  // 3. Do the work inside the Amplify SSR context
  return await withAmplifyAuth(event, async (contextSpec) => {
    const session = await fetchAuthSession(contextSpec)
    const userId = session.tokens?.idToken?.payload?.sub
    if (!userId) {
      throw createError({ statusCode: 401, statusMessage: 'User authentication data incomplete' })
    }

    const client = getServerUserPoolDataClient()
    const { data: plan } = await client.models.SubscriptionPlan.get(contextSpec, { planId })
    if (!plan) {
      throw createError({ statusCode: 400, statusMessage: `Unknown plan: ${planId}` })
    }

    return { success: true, data: { /* ... */ } }
  })
})
```

Public route (real example: `layers/billing/server/api/billing/plans.get.ts`):

```typescript
import { withAmplifyPublic, getServerPublicDataClient } from '@mmshark/amplify-layer/server/utils/amplify'

export default defineEventHandler(async (event) => {
  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()
    const { data: plans, errors } = await client.models.SubscriptionPlan.list(contextSpec, {
      filter: { isActive: { eq: true } }
    })
    if (errors?.length) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch subscription plans' })
    }
    return { success: true, data: { plans } }
  })
})
```

## Input validation (MUST — known gap in existing routes)

Invalid input must return **400**, never 500. Zod's `schema.parse()` throws a `ZodError`, which is not an `H3Error`, so h3 surfaces it as a generic 500. Use one of:

```typescript
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1) })

// Option A — h3 built-in: wraps validation failure in a 400 automatically
const input = await readValidatedBody(event, schema.parse)

// Option B — safeParse with an explicit, structured 400
const result = schema.safeParse(await readBody(event))
if (!result.success) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Bad Request',
    data: { code: 'VALIDATION_ERROR', issues: result.error.issues }
  })
}
```

For query params, `getValidatedQuery(event, schema.parse)` (used correctly in `layers/entitlements/server/api/entitlements/check-feature.get.ts`).

**Current status — validation is not homogeneous:**

| Routes | Today | Consequence |
|---|---|---|
| workspaces mutations (`layers/workspaces/server/api/workspaces/index.post.ts`, `[id]/index.put.ts`, `[id]/members/invite.post.ts`, `[id]/members/[userId]/role.patch.ts`) | raw `schema.parse(body)` | invalid body → 500 instead of 400 |
| billing (`checkout.post.ts`, `portal.post.ts`) | manual `typeof` checks → explicit 400 | correct, but no schema |
| billing `invoices.get.ts` | `limit` query param not bounded | oversized values pass through |

New routes MUST use `readValidatedBody`/`getValidatedQuery` or `safeParse`; touching one of the routes above means fixing it to match.

## Error handling

Always throw `createError` — never bare `throw new Error(...)` (leaks a 500 with no contract, as with the ZodError case above). Minimum shape: `statusCode` + `statusMessage`; add `data` for machine-readable context.

| Status | Use |
|---|---|
| 400 | Validation failed / bad parameters |
| 401 | Not authenticated (no session tokens) |
| 403 | Authenticated but lacks permission (`requirePermission`) |
| 404 | Resource not found |
| 500 | Unexpected server/upstream error |

The old doc prescribed a `data.code` enum (`VALIDATION_ERROR`, `UNAUTHORIZED`, …) on every error. Current status: existing routes mostly set only `statusCode`/`statusMessage`; `data` payloads appear ad hoc (e.g. `requirePermission` sets `data.requiredPermission`). Treat `data.code` as recommended for new validation errors, not as an implemented contract clients can rely on.

## Response shape

Target convention for new endpoints:

```typescript
return { success: true, data: { ... } }
```

Current status: billing routes follow it (`checkout.post.ts`, `plans.get.ts`); auth returns `{ profile }` (`layers/auth/server/api/profile.get.ts`); workspaces routes return the domain object directly (`index.post.ts` returns `Workspace`). Do not assume a uniform envelope when consuming existing endpoints — check the route. New routes use the envelope.

## Anti-patterns

- **Trusting client-supplied identity** — `getQuery(event).userId` or body `userId` as the acting user. Identity comes only from the session inside `withAmplifyAuth`.
- **`context.user` in the wrapper callback** — does not exist; the callback parameter is an Amplify `contextSpec`.
- **Raw `schema.parse()` on request input** — produces 500s (see validation section).
- **Skipping `contextSpec`** on Data client calls — server clients require it as the first argument.
- **Unauthenticated routes in apps** — `apps/saas/server/api/{customers,mails,notifications}.ts` are Nuxt UI template demo stubs serving static data with no auth; they do not follow this pattern and must not be used as reference.

## Current status

- Pattern is implemented across `layers/{auth,billing,entitlements,workspaces}/server/api/` (22 routes), backed by shared utilities in `layers/amplify/server/utils/amplify.ts`.
- `PUT /api/profile` (`layers/auth/server/api/profile.put.ts`) deliberately returns 501 — profile attributes are updated client-side via Amplify Auth.
- **No rate limiting** exists anywhere in the Nitro layer (no nuxt-security, no custom limiter). Unimplemented.
- **No public API-key system** exists — `apiKey` in the code is the AppSync auth mode for public reads, not customer API keys. Unimplemented.
- **No API tests** exist (the old doc's testing section described tests that were never written).
- Validation and response-shape inconsistencies listed above are open tech debt.
