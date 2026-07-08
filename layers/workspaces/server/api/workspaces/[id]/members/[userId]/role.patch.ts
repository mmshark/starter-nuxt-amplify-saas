import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { z } from 'zod'
import { getSessionAccessToken, invokeWorkspaceMembership } from '../../../../../utils/workspaceMembership'

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER'])
})

/**
 * PATCH /api/workspaces/[id]/members/[userId]/role
 * Update a member's role (OWNER only)
 *
 * Delegates to the `workspace-membership` function, because a role change
 * must also add/remove the target user in the workspace's `ws:<id>:admins`
 * Cognito group (admin permissions the server does not hold). The Lambda
 * re-verifies that the caller is the workspace OWNER.
 *
 * NOTE: the target user's tokens only reflect the change after their next
 * token refresh.
 */
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id')
  const targetUserId = getRouterParam(event, 'userId')
  const body = await readBody(event)

  if (!workspaceId || !targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Workspace ID and User ID are required',
      data: { code: 'VALIDATION_ERROR' }
    })
  }

  // Validate input
  const input = updateRoleSchema.parse(body)

  const accessToken = getSessionAccessToken(event)

  return await withAmplifyAuth(event, (contextSpec) =>
    invokeWorkspaceMembership<{ success: boolean }>(contextSpec, accessToken, {
      action: 'updateMemberRole',
      workspaceId,
      targetUserId,
      role: input.role
    })
  )
})
