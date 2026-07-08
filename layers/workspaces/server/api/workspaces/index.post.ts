import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import { z } from 'zod'
import { getSessionAccessToken, invokeWorkspaceMembership } from '../../utils/workspaceMembership'
import type { Workspace } from '../../../types/workspaces'

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional()
})

/**
 * POST /api/workspaces
 * Create a new workspace
 *
 * Delegates to the `workspace-membership` function: workspace creation must
 * provision the workspace's Cognito groups (`ws:<id>:members` /
 * `ws:<id>:admins`) and write tenant rows the creator's CURRENT token cannot
 * yet authorize (group claims only appear on the next token refresh).
 * The Lambda verifies the forwarded access token and creates the workspace,
 * the OWNER membership, the groups and the Stripe billing bootstrap
 * atomically (with rollback).
 */
export default defineEventHandler(async (event): Promise<Workspace> => {
  const body = await readBody(event)

  // Validate input
  const input = createWorkspaceSchema.parse(body)

  const accessToken = getSessionAccessToken(event)

  return await withAmplifyAuth(event, (contextSpec) =>
    invokeWorkspaceMembership<Workspace>(contextSpec, accessToken, {
      action: 'createWorkspace',
      name: input.name,
      slug: input.slug,
      description: input.description
    })
  )
})
