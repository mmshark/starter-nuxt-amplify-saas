import { getServerIamDataClient, withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { ensureWorkspaceBilling } from '@mmshark/billing-layer/server/utils/ensureWorkspaceBilling'
import Stripe from 'stripe'
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

  // Validate input
  const input = createWorkspaceSchema.parse(body)

  const config = useRuntimeConfig()
  if (!config.stripe?.secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration missing'
    })
  }
  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2025-02-24.acacia'
  })

  return await withAmplifyAuth(event, async (contextSpec) => {
    const client = getServerIamDataClient()

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
    const { data: member, errors: memberErrors } = await client.models.WorkspaceMember.create(contextSpec, memberData)

    if (memberErrors) {
      console.error('Failed to create workspace member:', memberErrors)

      // Rollback: Delete the workspace to avoid orphans
      // Rollback: Delete the orphaned workspace
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
    }

    // One Stripe customer PER WORKSPACE. Idempotent on workspaceId (see
    // ensureWorkspaceBilling): safe to retry, never creates a duplicate customer.
    try {
      await ensureWorkspaceBilling({
        workspaceId: workspace.id,
        stripe,
        client,
        contextSpec,
        customerEmail: memberData.email,
        customerName: memberData.name
      })
    } catch (billingError) {
      console.error('Failed to provision workspace billing:', billingError)

      // Rollback: remove the member and the orphaned workspace
      if (member?.id) {
        await client.models.WorkspaceMember.delete(contextSpec, { id: member.id })
      }
      await client.models.Workspace.delete(contextSpec, { id: workspace.id })

      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Failed to provision workspace billing',
        data: {
          code: 'INTERNAL_ERROR'
        }
      })
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
