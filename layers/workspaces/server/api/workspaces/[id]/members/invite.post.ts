import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { z } from 'zod'
import { getSessionAccessToken, invokeWorkspaceMembership } from '../../../../utils/workspaceMembership'

const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'MEMBER']),
  message: z.string().optional()
})

/**
 * POST /api/workspaces/[id]/members/invite
 * Invite a new member to the workspace (OWNER/ADMIN only)
 *
 * Delegates to the `workspace-membership` function: tenant tables are
 * READ-ONLY for client principals, so the invitation row can only be created
 * by the Lambda. The Lambda re-verifies the caller's OWNER/ADMIN role from
 * the forwarded (Cognito-verified) access token, derives the invitation's
 * `readerGroups`/`writerGroups` from the workspace id itself — never from
 * client input — and stamps `invitedBy`/`inviterEmail` from the VERIFIED
 * caller identity.
 */
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Workspace ID is required',
      data: { code: 'VALIDATION_ERROR' }
    })
  }

  // Validate input
  const input = inviteMemberSchema.parse(body)

  const accessToken = getSessionAccessToken(event)

  return await withAmplifyAuth(event, (contextSpec) =>
    invokeWorkspaceMembership<{ id: string; success: boolean; message: string }>(
      contextSpec,
      accessToken,
      {
        action: 'createInvitation',
        workspaceId,
        email: input.email,
        role: input.role,
        message: input.message
      }
    )
  )
})
