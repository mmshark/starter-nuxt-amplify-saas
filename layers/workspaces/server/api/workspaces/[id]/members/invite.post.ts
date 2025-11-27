import { getServerPublicDataClient, withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { z } from 'zod'

const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'MEMBER']),
  message: z.string().optional()
})

/**
 * POST /api/workspaces/[id]/members/invite
 * Invite a new member to the workspace
 */
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id')
  const user = event.context.user
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

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Verify user is admin/owner
    const { data: membership } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: {
        and: [
          { workspaceId: { eq: workspaceId } },
          { userId: { eq: user.userId } }
        ]
      }
    })

    if (!membership || membership.length === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'You are not a member of this workspace',
        data: { code: 'FORBIDDEN' }
      })
    }

    const userRole = membership[0].role
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Only workspace owners and admins can invite members',
        data: {
          code: 'FORBIDDEN',
          details: { requiredRole: ['OWNER', 'ADMIN'] }
        }
      })
    }

    // Create invitation
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    const { data: invitation, errors } = await client.models.WorkspaceInvitation.create(contextSpec, {
      workspaceId,
      email: input.email,
      role: input.role,
      invitedBy: user.userId,
      inviterName: user.username || '',
      inviterEmail: user.signInDetails?.loginId || '',
      message: input.message,
      token,
      expiresAt: expiresAt.toISOString(),
      status: 'PENDING'
    })

    if (errors || !invitation) {
      console.error('Failed to create invitation:', errors)
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to create invitation',
        data: {
          code: 'INTERNAL_ERROR',
          details: errors
        }
      })
    }

    // TODO: Send invitation email via Notifications layer

    return {
      id: invitation.id,
      success: true,
      message: 'Invitation sent successfully'
    }
  })
})
