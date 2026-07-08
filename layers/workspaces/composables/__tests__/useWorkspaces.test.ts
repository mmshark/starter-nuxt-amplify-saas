import { describe, it, expect, vi, beforeEach } from 'vitest'

// useWorkspaces relies on Nuxt auto-imports (useState, useCookie, useUser,
// computed, $fetch). We stub them on globalThis with minimal ref/computed
// shims (no `vue` import — the workspaces layer doesn't depend on vue in
// this test's resolution context) so it runs in a plain Node environment.

type Box<T> = { value: T }
const makeRef = <T>(v: T): Box<T> => ({ value: v })
const makeComputed = <T>(fn: () => T): Box<T> => ({ get value() { return fn() } })

const stateStore = new Map<string, Box<unknown>>()

function installNuxtStubs(opts: {
  user: { userId: string } | null
  fetchResult: unknown
}) {
  stateStore.clear()
  const g = globalThis as Record<string, unknown>
  g.computed = makeComputed
  g.useState = (key: string, init: () => unknown) => {
    if (!stateStore.has(key)) stateStore.set(key, makeRef(init()))
    return stateStore.get(key)
  }
  g.useCookie = () => makeRef<string | null>(null)
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
