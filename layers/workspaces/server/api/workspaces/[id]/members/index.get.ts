import { getServerPublicDataClient, withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import type { WorkspaceMember } from '../../../../types/workspaces'

/**
 * GET /api/workspaces/[id]/members
 * List all members of a workspace
 */
export default defineEventHandler(async (event): Promise<WorkspaceMember[]> => {
  const workspaceId = getRouterParam(event, 'id')
  const user = event.context.user

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID is required'
    })
  }

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Verify user is a member of this workspace
    const { data: membership } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: {
        and: [
          { workspaceId: { eq: workspaceId } },
          { userId: { eq: user.userId } }
        ]
      }
    })

    if (!membership || membership.length === 0) {
      throw createError({
        statusCode: 403,
        message: 'You are not a member of this workspace'
      })
    }

    // Get all members
    const { data: members } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: { workspaceId: { eq: workspaceId } }
    })

    return (members || []).map(m => ({
      workspaceId: m.workspaceId,
      userId: m.userId,
      email: m.email,
      name: m.name || undefined,
      role: m.role as 'OWNER' | 'ADMIN' | 'MEMBER',
      joinedAt: m.joinedAt
    }))
  })
})
