import { getServerPublicDataClient, withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import type { Workspace } from '../../../types/workspaces'

/**
 * GET /api/workspaces
 * List all workspaces for the authenticated user
 */
export default defineEventHandler(async (event): Promise<Workspace[]> => {
  const user = event.context.user

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Get all workspace memberships for this user
    const { data: memberships } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: { userId: { eq: user.userId } }
    })

    if (!memberships || memberships.length === 0) {
      return []
    }

    // Get all workspaces for these memberships
    const workspaceIds = memberships.map(m => m.workspaceId)
    const { data: workspaces } = await client.models.Workspace.list(contextSpec, {
      filter: {
        or: workspaceIds.map(id => ({ id: { eq: id } }))
      }
    })

    return (workspaces || []).map(ws => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug || undefined,
      description: ws.description || undefined,
      ownerId: ws.ownerId,
      isPersonal: ws.isPersonal || false,
      memberCount: ws.memberCount || 0,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt
    }))
  })
})
