import { getServerPublicDataClient, withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { z } from 'zod'
import type { Workspace } from '../../../types/workspaces'

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional()
})

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export default defineEventHandler(async (event): Promise<Workspace> => {
  const user = event.context.user
  const body = await readBody(event)

  // Validate input
  const input = createWorkspaceSchema.parse(body)

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Create workspace
    const { data: workspace, errors } = await client.models.Workspace.create(contextSpec, {
      name: input.name,
      slug: input.slug || input.name.toLowerCase().replace(/\s+/g, '-'),
      description: input.description,
      ownerId: user.userId,
      isPersonal: false,
      memberCount: 1
    })

    if (errors || !workspace) {
      throw createError({
        statusCode: 500,
        message: 'Failed to create workspace'
      })
    }

    // Add creator as owner member
    await client.models.WorkspaceMember.create(contextSpec, {
      workspaceId: workspace.id,
      userId: user.userId,
      email: user.signInDetails?.loginId || '',
      name: user.username || '',
      role: 'OWNER',
      joinedAt: new Date().toISOString()
    })

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug || undefined,
      description: workspace.description || undefined,
      ownerId: workspace.ownerId,
      isPersonal: workspace.isPersonal || false,
      memberCount: workspace.memberCount || 1,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt
    }
  })
})
