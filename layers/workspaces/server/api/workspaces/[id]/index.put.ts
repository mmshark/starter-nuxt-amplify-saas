import { getServerIamDataClient, withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { z } from 'zod'
import type { Workspace } from '../../../../types/workspaces'

const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  description: z.string().max(500).optional()
})

/**
 * PUT /api/workspaces/[id]
 * Update a workspace (OWNER or ADMIN only)
 */
export default defineEventHandler(async (event): Promise<Workspace> => {
  const user = event.context.user
  const workspaceId = getRouterParam(event, 'id')

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    })
  }

  const body = await readBody(event)
  const input = updateWorkspaceSchema.parse(body)

  return await withAmplifyAuth(event, async (contextSpec) => {
    const client = getServerIamDataClient()

    // Verify workspace exists
    const { data: workspace } = await client.models.Workspace.get(contextSpec, { id: workspaceId })

    if (!workspace) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Workspace not found'
      })
    }

    // Check permissions: must be OWNER or ADMIN
    const { data: memberships } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: {
        workspaceId: { eq: workspaceId },
        userId: { eq: user.userId }
      }
    })

    const membership = memberships?.[0]
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only workspace owners and admins can update workspace settings'
      })
    }

    // Build update payload
    const updatePayload: Record<string, any> = { id: workspaceId }
    if (input.name !== undefined) updatePayload.name = input.name
    if (input.description !== undefined) updatePayload.description = input.description

    const { data: updatedWorkspace, errors } = await client.models.Workspace.update(contextSpec, updatePayload)

    if (errors || !updatedWorkspace) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update workspace'
      })
    }

    return {
      id: updatedWorkspace.id,
      name: updatedWorkspace.name,
      slug: updatedWorkspace.slug || undefined,
      description: updatedWorkspace.description || undefined,
      ownerId: updatedWorkspace.ownerId,
      isPersonal: updatedWorkspace.isPersonal || false,
      memberCount: updatedWorkspace.memberCount || 0,
      createdAt: updatedWorkspace.createdAt,
      updatedAt: updatedWorkspace.updatedAt
    }
  })
})
