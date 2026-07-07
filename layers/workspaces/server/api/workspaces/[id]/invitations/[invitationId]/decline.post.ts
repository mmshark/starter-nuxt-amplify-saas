import { getServerIamDataClient, withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'

/**
 * POST /api/workspaces/[id]/invitations/[invitationId]/decline
 * Decline a workspace invitation
 */
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id')
  const invitationId = getRouterParam(event, 'invitationId')

  if (!workspaceId || !invitationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID and Invitation ID are required'
    })
  }

  return await withAmplifyAuth(event, async (contextSpec) => {
    const client = getServerIamDataClient()

    // Fetch invitation
    const { data: invitations } = await client.models.WorkspaceInvitation.list(contextSpec, {
      filter: {
        id: { eq: invitationId },
        workspaceId: { eq: workspaceId }
      }
    })

    const invitation = invitations?.[0]

    if (!invitation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Invitation not found'
      })
    }

    if (invitation.status !== 'PENDING') {
      throw createError({
        statusCode: 400,
        statusMessage: `Invitation is already ${invitation.status.toLowerCase()}`
      })
    }

    // Update invitation status to declined
    await client.models.WorkspaceInvitation.update(contextSpec, {
      id: invitationId,
      status: 'DECLINED'
    })

    return { success: true }
  })
})
