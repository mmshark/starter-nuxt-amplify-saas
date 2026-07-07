import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { getSessionAccessToken, invokeWorkspaceMembership } from '../../../../utils/workspaceMembership'

/**
 * DELETE /api/workspaces/[id]/members/[userId]
 * Remove a member from the workspace (OWNER/ADMIN only)
 *
 * Delegates to the `workspace-membership` function, because removal must
 * also take the target user out of the workspace's Cognito groups (admin
 * permissions the server does not hold). The Lambda re-verifies the caller's
 * OWNER/ADMIN role and refuses to remove the workspace owner.
 *
 * NOTE: the removed user's existing tokens keep the group claim until they
 * expire/refresh; the member row deletion revokes route access immediately.
 */
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id')
  const targetUserId = getRouterParam(event, 'userId')

  if (!workspaceId || !targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Workspace ID and User ID are required',
      data: { code: 'VALIDATION_ERROR' }
    })
  }

  const accessToken = getSessionAccessToken(event)

  return await withAmplifyAuth(event, (contextSpec) =>
    invokeWorkspaceMembership<{ success: boolean }>(contextSpec, accessToken, {
      action: 'removeMember',
      workspaceId,
      targetUserId
    })
  )
})
