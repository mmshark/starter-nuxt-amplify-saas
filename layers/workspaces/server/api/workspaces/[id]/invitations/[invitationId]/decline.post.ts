import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { getSessionAccessToken, invokeWorkspaceMembership, readInvitationToken } from '../../../../../utils/workspaceMembership'

/**
 * POST /api/workspaces/[id]/invitations/[invitationId]/decline
 * Decline a workspace invitation
 *
 * Delegates to the `workspace-membership` function: the declining user is
 * not a member of the workspace, so their token cannot read or update the
 * invitation row. The Lambda allows two distinct callers: the invitee
 * (email match + the invitation `token`, forwarded here if the client
 * supplied one) or a current workspace OWNER/ADMIN revoking on someone
 * else's behalf (no token required — the Lambda re-checks their role
 * instead). The token is optional at this layer; the Lambda decides whether
 * it's required for the resolved caller.
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

  const token = await readInvitationToken(event)
  const accessToken = getSessionAccessToken(event)

  return await withAmplifyAuth(event, (contextSpec) =>
    invokeWorkspaceMembership<{ success: boolean }>(contextSpec, accessToken, {
      action: 'declineInvitation',
      workspaceId,
      invitationId,
      token
    })
  )
})
