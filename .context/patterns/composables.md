# Pattern: SSR-Safe Composables

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/patterns/composables.pattern.md

Mandatory pattern for all composables in `layers/*/composables/` and `apps/*/app/composables/`. Nuxt runs composables on both server (Node, one process serving many requests) and client (browser). Getting shared state wrong causes hydration mismatches or, worse, leaks one user's state into another user's SSR render.

## Rules (normative)

| # | Rule | Enforced where |
|---|------|----------------|
| 1 | Shared, serializable state MUST use `useState('<namespace>:<key>', init)`. Never module-scope `ref()`/variables — they are singletons shared across concurrent server requests. | `layers/auth/composables/useUser.ts:10-20` |
| 2 | Universal composables MUST NOT be wrapped in `createSharedComposable`. It memoizes one instance for the Nuxt app's lifetime; on the server an app instance can be pooled across requests, leaking state cross-request. `useState` already dedupes by key, so nothing is lost by omitting it. | `useUser.ts:454-462`, `layers/entitlements/composables/useEntitlements.ts:14-21` |
| 3 | Secrets (JWTs, refresh tokens) MUST NOT be written into `useState` on the server — `useState` is serialized into the SSR payload (`window.__NUXT__`). Populate token state only under `import.meta.client`. | `useUser.ts:393-402` |
| 4 | Actions that only work in the browser (Amplify Auth `signIn`/`signUp`/`signOut`/`updateAttributes`) MUST throw early on the server (`if (import.meta.server) throw ...`) instead of silently no-oping. | `useUser.ts:116-118, 297-303` |
| 5 | Capture `useNuxtApp()` (and other context-dependent composables) **before** the first `await` — Nuxt context is lost across async boundaries. | `useUser.ts:120-121` |
| 6 | `createSharedComposable` is allowed **only** for client-only, non-serializable side effects (DOM/keyboard listeners, WebSockets) that must not be hydrated. | No current production usage; review required when introduced |
| 7 | Per-resource fetched collections MAY use keyed `useAsyncData` instead of `useState` — it caches, hydrates, and dedupes server→client fetches. | `layers/workspaces/composables/useWorkspaceMembers.ts:5-29` |

## Pattern 1 — Resource composable (shared state / data fetching)

For user session, API data, global UI state. Real, current code from `layers/workspaces/composables/useWorkspaces.ts` (condensed):

```typescript
export const useWorkspaces = () => {
  // useState guarantees one instance per key, per request — no wrapper needed
  const workspaces = useState<Workspace[]>('workspaces', () => [])
  const loading = useState<boolean>('workspaces-loading', () => false)
  const workspaceCookie = useCookie('current-workspace-id')
  const currentWorkspaceId = useState<string | null>('currentWorkspaceId', () => workspaceCookie.value || null)

  const currentWorkspace = computed(() =>
    workspaces.value.find(w => w.id === currentWorkspaceId.value) || null
  )

  const loadWorkspaces = async () => {
    loading.value = true
    try {
      const result = await $fetch<{ workspaces: Workspace[] }>('/api/workspaces')
      workspaces.value = result.workspaces
    } finally {
      loading.value = false
    }
  }

  return { workspaces, currentWorkspace, currentWorkspaceId, loading, loadWorkspaces }
}
```

Larger composables group their state in a factory and export a private implementation, plus an explicit server variant (`layers/auth/composables/useUser.ts`, condensed):

```typescript
const useUserState = () => ({
  isAuthenticated: useState<boolean>('user:isAuthenticated', () => false),
  currentUser: useState<any>('user:currentUser', () => null),
  loading: useState<boolean>('user:loading', () => false),
  error: useState<string | null>('user:error', () => null)
})

const _useUser = () => {
  const userState = useUserState()
  // ...actions...
  return { ...userState, /* signIn, signOut, fetchUser, ... */ }
}

// Intentionally NOT createSharedComposable — see Rule 2
export const useUser = _useUser

export const useUserServer = () => {
  if (import.meta.client) {
    throw new Error('useUserServer() should only be used on the server')
  }
  return _useUser()
}
```

State keys are namespaced `<feature>:<key>` (`user:*`); when state is scoped to a resource, parameterize the key — `useBilling` keys everything by workspace: `` useState(`billing:${id.value}:subscription`, ...) `` (`layers/billing/composables/useBilling.ts:31-48`).

## Pattern 2 — Browser-only side effects (`createSharedComposable`)

Only for non-hydrated, client-only concerns. Example shape (the former dashboard shortcut consumer
was removed by E03):

```typescript
import { createSharedComposable } from '@vueuse/core'

const _useClientObserver = () => {
  if (import.meta.server) throw new Error('Client-only observer')
  const target = shallowRef<Element | null>(null)
  // register and dispose a DOM observer here
  return { target }
}

export const useClientObserver = createSharedComposable(_useClientObserver)
```

Note: `createSharedComposable` must be imported explicitly — `@vueuse/core` is not auto-imported in this repo.

## What counts as "non-serializable"?

`useState` requires values that survive JSON serialization for server→client hydration.

| Use `useState` (serializable) | Use `createSharedComposable` (non-serializable, client-only) |
|---|---|
| Primitives, plain objects, arrays, `Date` | Functions/callbacks, event listener registrations |
| API response data | DOM elements, `window`/`document` refs |
| Flags, ids, form state | `WebSocket`, `IntersectionObserver`, `Worker`, class instances |

## Current status

The pattern is implemented, not aspirational. Verified against code (2026-07-08):

- Compliant: `useUser` (`layers/auth/composables/useUser.ts`), `useWorkspaces` (`layers/workspaces/composables/useWorkspaces.ts`), `useBilling` (`layers/billing/composables/useBilling.ts`), `useEntitlements` (`layers/entitlements/composables/useEntitlements.ts` — pure `computed` over `useState`-backed composables), `useWorkspaceMembers` (keyed `useAsyncData`, Rule 7).
- There is currently no production `createSharedComposable` usage; E03 removed the dashboard
  shortcut composable with the template notification surface.
- Known deviations: `useWorkspaces` state keys are not namespaced (`'workspaces'`, `'currentWorkspaceId'` instead of `workspaces:*`); `useEntitlements.ts:22` destructures `user` from `useUser()`, which returns `currentUser` — `user` is always `undefined` (latent bug, currently masked because the entitlements UI gating is unconsumed; see the entitlements audit).
