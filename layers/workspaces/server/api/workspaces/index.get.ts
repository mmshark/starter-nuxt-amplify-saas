import { getServerPublicDataClient, withAmplifyPublic } from '@mmshark/amplify-layer/server/utils/amplify'
import type { Workspace } from '../../../types/workspaces'

/**
 * GET /api/workspaces
 * List all workspaces for the authenticated user
 *
 * Query params:
 * - limit: number (default 20, max 100)
 * - nextToken: string (pagination token)
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 20, 100)
  const nextToken = query.nextToken as string | undefined

  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()

    // Get all workspace memberships for this user
    const membershipOptions: any = {
      filter: { userId: { eq: user.userId } },
      limit,
    }
    if (nextToken) membershipOptions.nextToken = nextToken

    const { data: memberships, nextToken: memberNextToken } = await client.models.WorkspaceMember.list(contextSpec, membershipOptions)

    if (!memberships || memberships.length === 0) {
      return { workspaces: [], nextToken: null }
    }

    // Get all workspaces for these memberships
    const workspaceIds = memberships.map(m => m.workspaceId)
    const { data: workspaces } = await client.models.Workspace.list(contextSpec, {
      filter: {
        or: workspaceIds.map(id => ({ id: { eq: id } }))
      }
    })

    const items: Workspace[] = (workspaces || []).map(ws => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug || undefined,
      description: ws.description || undefined,
      ownerId: ws.ownerId,
      isPersonal: ws.isPersonal || false,
      memberCount: ws.memberCount || 0,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt
    }))

    return {
      workspaces: items,
      nextToken: memberNextToken || null
    }
  })
})
