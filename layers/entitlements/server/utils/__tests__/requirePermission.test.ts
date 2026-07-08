import { describe, it, expect, vi, beforeEach } from 'vitest'

// Authorization guard test (review: entitlements server enforcement was dead).
// We mock getWorkspaceRole (the workspace/role resolution) and stub the h3
// `createError` global so we can assert requirePermission's decision logic:
// a non-owner member must be rejected with 403 for the owner-only
// `manage-billing` permission, while an owner passes.

const getWorkspaceRole = vi.fn()
vi.mock('../getWorkspaceContext', () => ({
  getWorkspaceRole: (...args: unknown[]) => getWorkspaceRole(...args),
}))

beforeEach(() => {
  vi.resetModules()
  getWorkspaceRole.mockReset()
  ;(globalThis as Record<string, unknown>).createError = (opts: Record<string, unknown>) =>
    Object.assign(new Error(String(opts.message ?? opts.statusMessage)), opts)
})

const fakeEvent = {} as never

describe('requirePermission("manage-billing")', () => {
  it('rejects a non-owner member with 403', async () => {
    getWorkspaceRole.mockResolvedValue('member')
    const { requirePermission } = await import('../requirePermission')

    await expect(requirePermission(fakeEvent, 'manage-billing', 'ws-1')).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('allows an owner', async () => {
    getWorkspaceRole.mockResolvedValue('owner')
    const { requirePermission } = await import('../requirePermission')

    await expect(requirePermission(fakeEvent, 'manage-billing', 'ws-1')).resolves.toBeUndefined()
  })
})
