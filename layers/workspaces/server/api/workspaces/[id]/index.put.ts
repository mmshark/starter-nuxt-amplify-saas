import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { z } from 'zod'
import { getSessionAccessToken, invokeWorkspaceMembership } from '../../../utils/workspaceMembership'
import type { Workspace } from '../../../../types/workspaces'

const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  description: z.string().max(500).optional()
})

/**
 * PUT /api/workspaces/[id]
 * Update a workspace (OWNER or ADMIN only)
 *
 * Delegates to the `workspace-membership` function: tenant tables are
 * READ-ONLY for client principals, so the Workspace row can only be updated
 * by the Lambda. The Lambda re-verifies the caller's OWNER/ADMIN role from
 * the forwarded (Cognito-verified) access token and only ever updates
 * `name`/`description` — never `slug`, `ownerId` or the group fields.
 */
export default defineEventHandler(async (event): Promise<Workspace> => {
  const workspaceId = getRouterParam(event, 'id')

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    })
  }

  const body = await readBody(event)
  const input = updateWorkspaceSchema.parse(body)

  const accessToken = getSessionAccessToken(event)

  return await withAmplifyAuth(event, (contextSpec) =>
    invokeWorkspaceMembership<Workspace>(contextSpec, accessToken, {
      action: 'updateWorkspace',
      workspaceId,
      name: input.name,
      description: input.description
    })
  )
})
