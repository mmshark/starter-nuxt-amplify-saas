import { getServerPublicDataClient, withAmplifyPublic } from '@mmshark/amplify-layer/server/utils/amplify'

/**
 * DELETE /api/workspaces/[id]
 * Delete a workspace (OWNER only) with cascade delete of members
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  const workspaceId = getRouterParam(event, 'id')

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    })
  }

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Verify workspace exists
    const { data: workspace } = await client.models.Workspace.get(contextSpec, { id: workspaceId })

    if (!workspace) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Workspace not found'
      })
    }

    // Only workspace owner can delete
    if (workspace.ownerId !== user.userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only the workspace owner can delete this workspace'
      })
    }

    // Prevent deleting personal workspace
    if (workspace.isPersonal) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Personal workspaces cannot be deleted'
      })
    }

    // Cascade delete: remove all members first
    const { data: members } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: { workspaceId: { eq: workspaceId } }
    })

    if (members && members.length > 0) {
      await Promise.all(
        members.map(member =>
          client.models.WorkspaceMember.delete(contextSpec, {
            id: member.id
          })
        )
      )
    }

    // Delete the workspace
    const { errors } = await client.models.Workspace.delete(contextSpec, { id: workspaceId })

    if (errors) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete workspace'
      })
    }

    return { success: true }
  })
})
