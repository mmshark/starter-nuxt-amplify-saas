import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CURRENT_WORKSPACE_COOKIE } from '../../constants/workspaces'

// useWorkspaces relies on Nuxt auto-imports (useState, useCookie, useUser,
// computed, $fetch). We stub them on globalThis with minimal ref/computed
// shims (no `vue` import — the workspaces layer doesn't depend on vue in
// this test's resolution context) so it runs in a plain Node environment.

type Box<T> = { value: T }
const makeRef = <T>(v: T): Box<T> => ({ value: v })
const makeComputed = <T>(fn: () => T): Box<T> => ({ get value() { return fn() } })

const stateStore = new Map<string, Box<unknown>>()
// Per-name cookie store so tests can assert which cookie name was written
// (the whole point of BUG-01: client and server must agree on the name).
const cookieStore = new Map<string, Box<string | null>>()

function installNuxtStubs(opts: {
  user: { userId: string } | null
  fetchResult: unknown
}) {
  stateStore.clear()
  cookieStore.clear()
  const g = globalThis as Record<string, unknown>
  g.computed = makeComputed
  g.useState = (key: string, init: () => unknown) => {
    if (!stateStore.has(key)) stateStore.set(key, makeRef(init()))
    return stateStore.get(key)
  }
  g.useCookie = (name: string) => {
    if (!cookieStore.has(name)) cookieStore.set(name, makeRef<string | null>(null))
    return cookieStore.get(name)
  }
  g.useUser = () => ({ currentUser: makeRef(opts.user) })
  g.$fetch = vi.fn().mockResolvedValue(opts.fetchResult)
}

describe('useWorkspaces.loadWorkspaces', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('assigns the workspaces ARRAY from the paginated envelope, not the envelope', async () => {
    installNuxtStubs({
      user: { userId: 'u1' },
      fetchResult: {
        workspaces: [{ id: 'a', isPersonal: true, ownerId: 'u1' }],
        nextToken: null,
      },
    })
    const { useWorkspaces } = await import('../useWorkspaces')
    const { workspaces, loadWorkspaces } = useWorkspaces()

    await loadWorkspaces()

    expect(Array.isArray(workspaces.value)).toBe(true)
    expect(workspaces.value).toHaveLength(1)
    expect((workspaces.value[0] as { id: string }).id).toBe('a')
  })

  it('matches personalWorkspace on the user.userId field', async () => {
    installNuxtStubs({
      user: { userId: 'u1' },
      fetchResult: {
        workspaces: [{ id: 'p', isPersonal: true, ownerId: 'u1' }],
        nextToken: null,
      },
    })
    const { useWorkspaces } = await import('../useWorkspaces')
    const { personalWorkspace, loadWorkspaces } = useWorkspaces()

    await loadWorkspaces()

    expect(personalWorkspace.value).not.toBeNull()
    expect((personalWorkspace.value as { id: string }).id).toBe('p')
  })
})

describe('useWorkspaces cookie persistence', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('persists the auto-selected workspace to the canonical cookie', async () => {
    installNuxtStubs({
      user: { userId: 'u1' },
      fetchResult: {
        workspaces: [{ id: 'p', isPersonal: true, ownerId: 'u1' }],
        nextToken: null,
      },
    })
    const { useWorkspaces } = await import('../useWorkspaces')
    const { loadWorkspaces } = useWorkspaces()

    await loadWorkspaces()

    // The server (getWorkspaceContext) reads exactly this cookie name — a
    // regression to a different name would break the fallback again (BUG-01).
    expect(cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value).toBe('p')
  })

  it('persists the canonical cookie on switchWorkspace', async () => {
    installNuxtStubs({
      user: { userId: 'u1' },
      fetchResult: {
        workspaces: [
          { id: 'p', isPersonal: true, ownerId: 'u1' },
          { id: 'team', isPersonal: false, ownerId: 'u1' },
        ],
        nextToken: null,
      },
    })
    const { useWorkspaces } = await import('../useWorkspaces')
    const { loadWorkspaces, switchWorkspace } = useWorkspaces()

    await loadWorkspaces()
    switchWorkspace('team')

    expect(cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value).toBe('team')
  })
})
