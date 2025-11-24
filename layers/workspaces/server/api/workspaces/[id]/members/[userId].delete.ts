import { getServerPublicDataClient, withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

/**
 * DELETE /api/workspaces/[id]/members/[userId]
 * Remove a member from the workspace
 */
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id')
  const targetUserId = getRouterParam(event, 'userId')
  const user = event.context.user

  if (!workspaceId || !targetUserId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID and User ID are required'
    })
  }

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Verify requesting user is admin/owner
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
        message: 'Only workspace owners and admins can remove members'
      })
    }

    // Cannot remove workspace owner
    const { data: targetMember } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: {
        and: [
          { workspaceId: { eq: workspaceId } },
          { userId: { eq: targetUserId } }
        ]
      }
    })

    if (!targetMember || targetMember.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Member not found'
      })
    }

    if (targetMember[0].role === 'OWNER') {
      throw createError({
        statusCode: 403,
        message: 'Cannot remove workspace owner'
      })
    }

    // Delete member
    await client.models.WorkspaceMember.delete(contextSpec, { id: targetMember[0].id })

    // Update member count
    const { data: workspace } = await client.models.Workspace.get(contextSpec, { id: workspaceId })
    if (workspace) {
      await client.models.Workspace.update(contextSpec, {
        id: workspaceId,
        memberCount: (workspace.memberCount || 1) - 1
      })
    }

    return { success: true }
  })
})
