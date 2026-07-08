# PRD: Amplify Layer

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/amplify.md

## Purpose & scope

`layers/amplify` (`@mmshark/amplify-layer`) is the infrastructure layer that bridges Nuxt 4 universal rendering and AWS Amplify Gen2 (Cognito, AppSync/DynamoDB). It provides SSR-compatible Amplify configuration, a schema-typed data client, cookie-based authentication context propagation across the client/server boundary, and Nitro server utilities that every feature layer (auth, billing, entitlements, workspaces) builds on.

| In scope | Out of scope |
|---|---|
| Client + server Amplify configuration plugins | Authentication UI/flows (auth layer) |
| Schema-typed GraphQL/Data client | Business logic operations (feature layers) |
| Auth context propagation: browser → SSR → Nitro | Backend infrastructure definition (`apps/backend`) |
| Nitro utilities for authenticated and public server contexts | Custom GraphQL query composition |
| Shared tenancy helpers (workspace Cognito groups, `workspace-membership` Lambda client) | |
| S3 storage upload/download utilities (**target — see Current status**) | |
| Realtime subscription access pattern (**target — see Current status**) | |

The layer is infrastructure only — it implements no user-facing flows.

## Requirements

### R1 — Three execution contexts, one API

| Context | Entry point | Auth source |
|---|---|---|
| Browser | `$Amplify` from `plugins/01.amplify.client.ts` | Amplify-managed cookie token store (`ssr: true`) |
| SSR (pages/middleware) | `$Amplify` from `plugins/01.amplify.server.ts` | Cognito token cookies read via `useCookie` adapter (per-request isolation) |
| Nitro API routes | `server/utils/amplify.ts` helpers | Cognito token cookies parsed from the `H3Event` |

### R2 — Client plugin

`layers/amplify/plugins/01.amplify.client.ts`: calls `Amplify.configure(outputs, { ssr: true })` and provides:

- `$Amplify.Auth` — the full `aws-amplify/auth` module
- `$Amplify.GraphQL.client` — `generateClient<Schema>` with fixed `authMode: 'userPool'` (fail-safe default; public reads use a separate apiKey client or a server route)

### R3 — Server plugin

`layers/amplify/plugins/01.amplify.server.ts`: builds a cookie-backed key-value storage (`createKeyValueStorageFromCookieStorageAdapter` over `useCookie` refs — no cross-request pollution), wires token/credentials providers to it, and provides server-safe APIs where **every call runs inside `runWithAmplifyServerContext`**:

- `$Amplify.Auth.fetchAuthSession | fetchUserAttributes | getCurrentUser`
- `$Amplify.GraphQL.client.graphql()` (raw GraphQL wrapper; the typed `.models` API is not exposed on the server plugin)

### R4 — Nitro server utilities

`layers/amplify/server/utils/amplify.ts`:

| Export | Purpose |
|---|---|
| `withAmplifyAuth(event, cb)` | Server context recreated from the caller's token cookies. Does **not** assert a session itself — anonymous calls fail downstream at AppSync; routes must check identity if they need a clean 401 |
| `withAmplifyPublic(cb)` | Sessionless context, deliberately **no credentials provider** — apiKey reads only, cannot reach tenant data |
| `getServerUserPoolDataClient()` / `getServerPublicDataClient()` | Preconfigured `generateClient<Schema>` instances (`userPool` / `apiKey`) |
| `getAwsCredentials(contextSpec)`, `amplifyRegion` | Real AWS credentials (signed-in user's identity-pool role) for plain AWS SDK v3 clients, e.g. Lambda invoke |
| `amplifyOutputs.custom` | Deploy-time custom outputs (Stripe webhook URL, `workspace-membership` function name) |

### R5 — Auth modes

`userPool` (default, all authenticated operations) and `apiKey` (public read of `SubscriptionPlan` only). There is **deliberately no `iam` data client**: the previous `allow.authenticated('identityPool')` rules let any signed-in browser call AppSync directly and bypass route-level OWNER/ADMIN checks, so they were removed. This supersedes the source PRD's "userPool, apiKey, iam" requirement.

### R6 — Type safety from the backend schema

Types flow from the backend package export `@starter-nuxt-amplify-saas/backend/schema` (`apps/backend/package.json` maps `./schema` → `amplify/data/resource.ts`); all clients are `generateClient<Schema>`. The source PRD's codegen artifacts (`utils/graphql/API.ts`, `queries.ts`, `mutations.ts`, `subscriptions.ts`) were never generated, are not the current design, and are dropped from this spec.

### R7 — Tenancy support (shared across layers)

- `layers/amplify/server/utils/workspaceGroups.ts` — canonical `ws:<id>:members` / `ws:<id>:admins` Cognito group names and the `readerGroups`/`writerGroups` field values every tenant record must carry.
- `layers/amplify/server/utils/workspaceMembership.ts` — invoke client for the `workspace-membership` Lambda, called with the signed-in user's identity-pool credentials. All tenant-table writes go through privileged Lambdas; client principals are read-only via `allow.groupsDefinedIn('readerGroups')`.

This group-per-workspace model supersedes the source PRD's isolation claim ("AppSync resolvers validate `workspaceId` against membership").

### R8 — Storage (target)

`$Amplify.Storage.uploadData / getUrl` backed by a real storage resource (`amplify/storage/resource.ts` + bucket in `amplify_outputs.json`), with per-user/workspace path scoping and expiring signed URLs, available in both client and server contexts. **Not implemented today — see Current status.**

### R9 — Realtime (target)

A documented, client-only consumption pattern (e.g. a `useRealtime`/`observeQuery` composable with `onUnmounted` cleanup) over the AppSync subscriptions that the schema already auto-generates. **Not implemented today — see Current status.**

## Current status

Backed by the 2026-07-08 feature audit (areas `api`, `storage`, `realtime-updates`, `observability`).

| Capability | Status | Evidence |
|---|---|---|
| Client plugin (`$Amplify.Auth`, `$Amplify.GraphQL.client`) | **Implemented** | `layers/amplify/plugins/01.amplify.client.ts`. Only `$Amplify.Auth` has consumers (`layers/auth/composables/useUser.ts`, `layers/auth/components/Authenticator.vue`); no code consumes `$Amplify.GraphQL.client` for data — all browser data access goes through Nitro routes via `$fetch` |
| Server plugin (SSR Auth + GraphQL in server context) | **Implemented** | `layers/amplify/plugins/01.amplify.server.ts`; cookie adapter, per-request isolation, `runWithAmplifyServerContext` on every call. Provides **no** `Storage` |
| Nitro utilities (R4) | **Implemented and in real use** | Consumed by 20+ files across `layers/auth`, `layers/billing`, `layers/entitlements`, `layers/workspaces` (≈22 API routes total) |
| Tenancy helpers (R7) | **Implemented** | `layers/amplify/server/utils/workspaceGroups.ts`, `workspaceMembership.ts`; wiring in `apps/backend/amplify/backend.ts` |
| Schema type safety (R6) | **Implemented** | `generateClient<Schema>` everywhere; backend `./schema` export. No codegen files exist |
| S3 storage (R8) | **Not implemented — the exposed API breaks at runtime** | No storage resource in the backend: `apps/backend/amplify/backend.ts` defines only `auth`, `data` and 3 functions; `amplify/storage/resource.ts` does not exist, so the generated `amplify_outputs.json` has no bucket and any `$Amplify.Storage.uploadData/getUrl` call fails. `layers/amplify/types/amplify.d.ts` declares `$Amplify.Storage` globally, but the server plugin never provides it (SSR: `undefined`). No upload UI exists anywhere |
| Realtime subscriptions (R9) | **Not implemented** | Zero uses of `observeQuery`, `.subscribe()`, `onCreate/onUpdate/onDelete` in `apps/` and `layers/`; no `useRealtime` composable. Only the base exists: the client-plugin data client and auto-generated schema subscriptions |
| `createLogger` (`layers/amplify/utils/logger.ts`) | **Implemented, zero consumers** | Grep finds only its definition and the README; all actual logging is ad-hoc `console.*` (~30 files) |
| Layer tests | **None** | The source PRD's plugin test cases were never written; the repo's 3 unit-test files live in other layers |

## Open issues & risks

1. **Storage is a deceptive stub** — `layers/amplify/README.md` documents `$Amplify.Storage` as functional and `types/amplify.d.ts` types it for both contexts, but with no backend storage resource every documented usage fails at runtime (and is `undefined` in SSR). Either build the resource (roadmap E07 needs it for avatar upload) or remove the stub and its type/docs.
2. **`amplify_outputs.json` hard import breaks clean checkouts** — the file is gitignored (generated by sandbox/deploy) yet statically imported by both plugins and `server/utils/amplify.ts`; `typecheck`/build fail on a fresh clone (TS2307, part of the 341-error typecheck debt) and CI cannot pass without generating or stubbing it (roadmap E01).
3. **Documentation drift inside the layer** — `layers/amplify/README.md` and `AGENTS.md` claim `createLogger` is used across server code (0 real usages); the client plugin comment says the outputs default auth mode is `API_KEY` while `apps/backend/amplify/data/resource.ts` sets `defaultAuthorizationMode: 'userPool'`; the server plugin docblock shows a typed `.models` example but the provided wrapper exposes only `graphql()`; the API pattern doc's examples use a `contextSpec.user` property that does not exist.
4. **Tokens in JS-readable cookies** — Cognito tokens, including the refresh token, are stored in non-HttpOnly cookies (`sameSite: 'lax'`) by both the client token store and the SSR cookie adapter; an XSS could exfiltrate the full session. Inherent to the Amplify JS SSR adapter — accepted, but must stay documented.
5. **`withAmplifyAuth` contract mismatch** — the source PRD claimed it "throws if the user is not authenticated"; in reality it performs no session assertion, so anonymous calls surface as downstream AppSync errors rather than a clean 401 unless the route checks identity itself.
6. **Realtime is a second authorization surface** — subscriptions would go browser→AppSync directly with userPool tokens, relying solely on `allow.groupsDefinedIn('readerGroups')` (verified as supported by Amplify Gen2); `WorkspaceSubscription` has no owner rule, so live post-checkout refresh must be delivered via the workspace reader group. Validate before building E23.

## Related

- [roadmap.md](./roadmap.md) — epics covering the gaps: **E01** green-ci (outputs import / CI), **E07** account-management (adds the missing storage resource + avatar upload), **E10** observability (adopt `createLogger` everywhere or delete it), **E14** notifications + **E23** realtime (`useRealtime`, live delivery).
- [../patterns/api-server.md](../patterns/api-server.md) — how Nitro routes consume `withAmplifyAuth`/`withAmplifyPublic` and the data clients.
- [../patterns/error-handling.md](../patterns/error-handling.md) — error contract the routes built on these utilities must follow.
- `layers/amplify/README.md` — layer-local usage docs (currently carries the drift listed in Open issues #1 and #3).
