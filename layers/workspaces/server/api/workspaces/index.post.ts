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
  const userAttributes = event.context.userAttributes
  const body = await readBody(event)

  console.log('Creating workspace - User data:', JSON.stringify(user, null, 2))
  console.log('User attributes:', JSON.stringify(userAttributes, null, 2))

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
      console.error('Failed to create workspace:', errors)
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to create workspace',
        data: {
          code: 'INTERNAL_ERROR',
          details: errors
        }
      })
    }

    // Add creator as owner member
    const memberData = {
      workspaceId: workspace.id,
      userId: user.userId,
      email: userAttributes?.email || userAttributes?.preferred_username || user.username,
      name: userAttributes?.name || userAttributes?.given_name || user.username || '',
      role: 'OWNER',
      joinedAt: new Date().toISOString()
    }
    console.log('Creating workspace member:', JSON.stringify(memberData, null, 2))

    const { data: member, errors: memberErrors } = await client.models.WorkspaceMember.create(contextSpec, memberData)

    if (memberErrors) {
      console.error('Failed to create workspace member:', memberErrors)

      // Rollback: Delete the workspace to avoid orphans
      console.log('Rolling back: Deleting orphaned workspace', workspace.id)
      await client.models.Workspace.delete(contextSpec, { id: workspace.id })

      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to create workspace owner membership',
        data: {
          code: 'INTERNAL_ERROR',
          details: memberErrors
        }
      })
    } else {
      console.log('Workspace member created:', JSON.stringify(member, null, 2))
    }

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
