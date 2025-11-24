# Pattern: SSR-Safe Composables

## Context
Nuxt applications run in both server (Node.js) and client (Browser) environments. State management and side effects must be handled carefully to avoid hydration mismatches and security leaks.

## Problem
- **Hydration Mismatch**: Server renders one thing, client renders another.
- **State Leaks**: Global variables on the server sharing state between requests.
- **Redundant Fetching**: Client re-fetching data already fetched on the server.

## Solution
Use `useState` as the primary mechanism for shared, serializable state. It guarantees a unique instance per key and handles hydration automatically. Use `createSharedComposable` **only** for non-serializable, browser-only side effects.

## Pattern Details

### 1. Resource Composables (Data Fetching / State)
Use this pattern when the composable manages **shared state** or **data fetching** (e.g., user session, API data, global UI state).

```typescript
const _useFeature = () => {
  // 1. State: useState guarantees uniqueness per key (no need for createSharedComposable)
  const data = useState('feature:data', () => null)
  const loading = useState('feature:loading', () => false)

  // 2. Actions
  const fetch = async () => {
    loading.value = true
    try {
      // Universal logic
    } finally {
      loading.value = false
    }
  }

  return { data, loading, fetch }
}

// Export directly
export const useFeature = _useFeature
```

### 2. Browser-Only Pattern (Non-Serializable)
Use this **only** for browser side-effects (DOM listeners, WebSockets, localStorage watchers) that should NOT be hydrated.

```typescript
import { createSharedComposable } from '@vueuse/core'

const _useMouseTracker = () => {
  const x = ref(0)
  const y = ref(0)

  if (import.meta.client) {
    useEventListener(window, 'mousemove', (e) => {
      x.value = e.clientX
      y.value = e.clientY
    })
  }

  return { x, y }
}

// Use createSharedComposable to share the single listener instance
export const useMouseTracker = createSharedComposable(_useMouseTracker)
```

### Key Principles
- **Hydration**: If state needs to travel Server -> Client, use `useState`.
- **Uniqueness**: `useState` already ensures a singleton instance per key.
- **Isolation**: Never use global variables outside of `useState`.
- **Side Effects**: Use `createSharedComposable` only when `useState` is not applicable (non-serializable data).

### Appendix: What is "Non-Serializable"?
Data that cannot be converted to JSON/string for hydration (Server → Client transfer). `useState` requires serializable data.

**Non-Serializable Examples (Use `createSharedComposable`):**
- **Functions**: Callbacks, event handlers.
- **DOM Elements**: `ref<HTMLElement>`, `window`, `document`.
- **Browser APIs**: `WebSocket`, `IntersectionObserver`, `AudioContext`, `Worker`.
- **Classes**: Complex class instances with methods (unless they have custom serializers).

**Serializable Examples (Use `useState`):**
- **Primitives**: Strings, numbers, booleans.
- **Plain Objects**: JSON-like objects, Arrays.
- **Dates**: `Date` objects (Nuxt handles these automatically).
