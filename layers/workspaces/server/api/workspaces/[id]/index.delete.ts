import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { getSessionAccessToken, invokeWorkspaceMembership } from '../../../utils/workspaceMembership'

/**
 * DELETE /api/workspaces/[id]
 * Delete a workspace (OWNER only) with cascade delete of members,
 * invitations, the subscription row and the workspace's Cognito groups.
 *
 * Delegates to the `workspace-membership` function (Cognito group deletion
 * needs admin permissions the server does not hold); the Lambda re-checks
 * that the verified caller is the workspace owner and that the workspace is
 * not personal.
 */
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id')

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    })
  }

  const accessToken = getSessionAccessToken(event)

  return await withAmplifyAuth(event, (contextSpec) =>
    invokeWorkspaceMembership<{ success: boolean }>(contextSpec, accessToken, {
      action: 'deleteWorkspace',
      workspaceId
    })
  )
})
