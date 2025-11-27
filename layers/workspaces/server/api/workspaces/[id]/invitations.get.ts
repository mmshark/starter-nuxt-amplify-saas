import { getServerPublicDataClient, withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import type { WorkspaceInvitation } from '../../../../types/workspaces'

/**
 * GET /api/workspaces/[id]/invitations
 * List all pending invitations for a workspace
 */
export default defineEventHandler(async (event): Promise<WorkspaceInvitation[]> => {
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

    // Verify user is admin/owner
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

    const userRole = membership[0].role
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        message: 'Only workspace owners and admins can view invitations'
      })
    }

    // Get pending invitations
    const { data: invitations } = await client.models.WorkspaceInvitation.list(contextSpec, {
      filter: {
        and: [
          { workspaceId: { eq: workspaceId } },
          { status: { eq: 'PENDING' } }
        ]
      }
    })

    return (invitations || []).map(inv => ({
      id: inv.id,
      workspaceId: inv.workspaceId,
      email: inv.email,
      role: inv.role as 'ADMIN' | 'MEMBER',
      invitedBy: inv.invitedBy,
      inviterName: inv.inviterName || undefined,
      inviterEmail: inv.inviterEmail || undefined,
      message: inv.message || undefined,
      token: inv.token,
      expiresAt: inv.expiresAt,
      status: inv.status as 'PENDING' | 'ACCEPTED' | 'DECLINED',
      createdAt: inv.createdAt
    }))
  })
})
