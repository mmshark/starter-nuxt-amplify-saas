import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { getSessionAccessToken, invokeWorkspaceMembership } from '../../../../../utils/workspaceMembership'

/**
 * POST /api/workspaces/[id]/invitations/[invitationId]/decline
 * Decline a workspace invitation
 *
 * Delegates to the `workspace-membership` function: the declining user is
 * not a member of the workspace, so their token cannot read or update the
 * invitation row. The Lambda checks the invitation email against the
 * VERIFIED caller email before marking it DECLINED.
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

  const accessToken = getSessionAccessToken(event)

  return await withAmplifyAuth(event, (contextSpec) =>
    invokeWorkspaceMembership<{ success: boolean }>(contextSpec, accessToken, {
      action: 'declineInvitation',
      workspaceId,
      invitationId
    })
  )
})
