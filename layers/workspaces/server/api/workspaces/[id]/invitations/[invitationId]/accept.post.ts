import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { getSessionAccessToken, invokeWorkspaceMembership } from '../../../../../utils/workspaceMembership'

/**
 * POST /api/workspaces/[id]/invitations/[invitationId]/accept
 * Accept a workspace invitation
 *
 * Delegates to the `workspace-membership` function: the accepting user is
 * not yet in any of the workspace's Cognito groups, so they can neither read
 * the invitation nor create their own member record with their current
 * token. The Lambda validates the invitation (PENDING, not expired, email
 * matches the VERIFIED caller email), creates the membership and adds the
 * user to `ws:<id>:members` (+ `ws:<id>:admins` for ADMIN/OWNER roles).
 *
 * NOTE: the new group only appears in the user's tokens after a refresh —
 * clients should force-refresh their session after accepting.
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
      action: 'acceptInvitation',
      workspaceId,
      invitationId
    })
  )
})
