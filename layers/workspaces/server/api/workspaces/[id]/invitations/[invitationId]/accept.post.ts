import { getServerIamDataClient, withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'

/**
 * POST /api/workspaces/[id]/invitations/[invitationId]/accept
 * Accept a workspace invitation
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
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

    // Check invitation is still pending
    if (invitation.status !== 'PENDING') {
      throw createError({
        statusCode: 400,
        statusMessage: `Invitation is already ${invitation.status.toLowerCase()}`
      })
    }

    // Check expiry
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      // Mark as expired
      await client.models.WorkspaceInvitation.update(contextSpec, {
        id: invitationId,
        status: 'EXPIRED'
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invitation has expired'
      })
    }

    // Verify the invitation email matches the current user
    const userEmail = event.context.userAttributes?.email
    if (invitation.email && userEmail && invitation.email !== userEmail) {
      throw createError({
        statusCode: 403,
        statusMessage: 'This invitation was sent to a different email address'
      })
    }

    // Create member record
    const { errors: memberErrors } = await client.models.WorkspaceMember.create(contextSpec, {
      workspaceId,
      userId: user.userId,
      email: userEmail || user.username || '',
      name: event.context.userAttributes?.name || event.context.userAttributes?.given_name || '',
      role: invitation.role || 'MEMBER',
      joinedAt: new Date().toISOString()
    })

    if (memberErrors) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create membership'
      })
    }

    // Update invitation status
    await client.models.WorkspaceInvitation.update(contextSpec, {
      id: invitationId,
      status: 'ACCEPTED'
    })

    // Increment workspace member count
    const { data: workspace } = await client.models.Workspace.get(contextSpec, { id: workspaceId })
    if (workspace) {
      await client.models.Workspace.update(contextSpec, {
        id: workspaceId,
        memberCount: (workspace.memberCount || 0) + 1
      })
    }

    return { success: true }
  })
})
