import { getServerPublicDataClient, withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { z } from 'zod'

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER'])
})

/**
 * PATCH /api/workspaces/[id]/members/[userId]/role
 * Update a member's role
 */
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id')
  const targetUserId = getRouterParam(event, 'userId')
  const user = event.context.user
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

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Verify requesting user is owner
    const { data: membership } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: {
        and: [
          { workspaceId: { eq: workspaceId } },
          { userId: { eq: user.userId } }
        ]
      }
    })

    if (!membership || membership.length === 0 || membership[0].role !== 'OWNER') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Only workspace owner can change member roles',
        data: {
          code: 'FORBIDDEN',
          details: { requiredRole: 'OWNER' }
        }
      })
    }

    // Get target member
    const { data: targetMember } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: {
        and: [
          { workspaceId: { eq: workspaceId } },
          { userId: { eq: targetUserId } }
        ]
      }
    })

    if (!targetMember || targetMember.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Member not found',
        data: { code: 'NOT_FOUND' }
      })
    }

    if (targetMember[0].role === 'OWNER') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Cannot change owner role',
        data: { code: 'FORBIDDEN', details: { reason: 'CANNOT_CHANGE_OWNER_ROLE' } }
      })
    }

    // Update role
    await client.models.WorkspaceMember.update(contextSpec, {
      id: targetMember[0].id,
      role: input.role
    })

    return { success: true }
  })
})
