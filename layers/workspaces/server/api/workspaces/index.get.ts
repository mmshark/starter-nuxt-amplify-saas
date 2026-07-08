import { getServerUserPoolDataClient, withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'
import type { Workspace, WorkspaceSubscription } from '../../../types/workspaces'

/**
 * GET /api/workspaces
 * List all workspaces for the authenticated user
 *
 * Uses the CALLER's userPool session: own memberships are readable via the
 * `ownerDefinedIn('userId')` rule, and each workspace via its
 * `ws:<id>:members` group claim. A workspace joined/created since the last
 * token refresh appears after the session refreshes.
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

  return await withAmplifyAuth(event, async (contextSpec) => {
    const client = getServerUserPoolDataClient()

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

    // Hydrate each workspace's subscription so the client/SSR entitlements
    // (useEntitlements().subscriptionPlan reads currentWorkspace.subscription
    // .planId) resolve the real plan instead of always falling back to 'free'.
    // Keyed gets on WorkspaceSubscription (PK: workspaceId) via the caller's
    // userPool session — same authorization and pattern as
    // getWorkspaceContext.ts. Page size is capped (limit ≤ 100) so the fan-out
    // stays bounded.
    const items: Workspace[] = await Promise.all((workspaces || []).map(async (ws): Promise<Workspace> => {
      const { data: sub } = await client.models.WorkspaceSubscription.get(
        contextSpec,
        { workspaceId: ws.id },
        { selectionSet: ['workspaceId', 'planId', 'status', 'currentPeriodEnd', 'cancelAtPeriodEnd'] }
      )

      const subscription: WorkspaceSubscription | null = sub
        ? {
            planId: sub.planId,
            status: sub.status as WorkspaceSubscription['status'],
            currentPeriodEnd: sub.currentPeriodEnd || undefined,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? undefined,
          }
        : null

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug || '',
        description: ws.description || undefined,
        ownerId: ws.ownerId,
        isPersonal: ws.isPersonal || false,
        memberCount: ws.memberCount || 0,
        subscription,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt
      }
    }))

    return {
      workspaces: items,
      nextToken: memberNextToken || null
    }
  })
})
