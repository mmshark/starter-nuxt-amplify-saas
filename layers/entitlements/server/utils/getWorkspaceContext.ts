/**
 * Server Utility - getWorkspaceContext
 *
 * Fetch workspace context (subscription and membership) for the authenticated user.
 * Used by server-side entitlements to determine plan and role.
 */

import type { H3Event } from 'h3'
import type { Plan, Role } from '../../types/entitlements'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@mmshark/workspaces-layer/types/workspaces'
import { CURRENT_WORKSPACE_COOKIE } from '@mmshark/workspaces-layer/constants/workspaces'
import { requireAuth } from '@mmshark/auth-layer/server/utils/auth'
import { withAmplifyAuth, getServerUserPoolDataClient } from '@mmshark/amplify-layer/server/utils/amplify'

interface WorkspaceContext {
  plan: Plan
  role: Role
  workspace: Workspace | null
  membership: WorkspaceMember | null
}

const KNOWN_PLANS: readonly Plan[] = ['free', 'starter', 'pro', 'enterprise']

/**
 * Get workspace context for the current user
 *
 * Authenticates the caller directly via the Amplify SSR session
 * (`requireAuth`) instead of trusting `event.context.user` — that used to
 * be populated only by the `/api/workspaces/*` middleware, so this helper
 * (and everything built on it: `requirePermission`, `requireFeature`,
 * `requirePlan`, `/api/entitlements/*`) 401'd for every other route prefix.
 *
 * Resolves membership/subscription with the same direct Data-client pattern
 * used elsewhere in the codebase (e.g. `billing/server/api/billing/
 * subscription.get.ts`) rather than an internal `$fetch` to
 * `/api/workspaces/:id` — that route only ever supported PUT/DELETE, so the
 * previous implementation's GET call 404'd on every request and silently
 * fell back to `free`/`user` (review-worthy bug found while wiring this up).
 *
 * @param event - H3 event from API route
 * @param workspaceIdOverride - explicit workspace id to evaluate instead of
 *   the `current-workspace-id` cookie. Callers that act on a caller-supplied
 *   `workspaceId` (e.g. billing checkout/portal) MUST pass it here so the
 *   permission check targets the workspace actually being acted on, not
 *   whichever workspace the UI happens to have "selected" in a cookie.
 * @returns Workspace context with plan and role
 * @throws 401 if user is not authenticated
 */
export async function getWorkspaceContext(event: H3Event, workspaceIdOverride?: string): Promise<WorkspaceContext> {
  const user = await requireAuth(event)

  const currentWorkspaceId = workspaceIdOverride || getCookie(event, CURRENT_WORKSPACE_COOKIE)

  // If no workspace is targeted, there is nothing to grant a plan/role for.
  if (!currentWorkspaceId) {
    return {
      plan: 'free',
      role: 'user',
      workspace: null,
      membership: null,
    }
  }

  try {
    return await withAmplifyAuth(event, async (contextSpec) => {
      const client = getServerUserPoolDataClient()

      const { data: members } = await client.models.WorkspaceMember.list(contextSpec, {
        filter: {
          workspaceId: { eq: currentWorkspaceId },
          userId: { eq: user.userId },
        },
      })
      const memberRecord = members?.[0]

      // Never grant a workspace's plan/role to a caller who isn't an actual
      // member of it. `current-workspace-id` (cookie or caller-supplied) is
      // client-controlled and proves nothing on its own — membership must
      // be verified server-side against the real WorkspaceMember table.
      if (!memberRecord) {
        return {
          plan: 'free',
          role: 'user',
          workspace: null,
          membership: null,
        }
      }

      const membership: WorkspaceMember = {
        workspaceId: memberRecord.workspaceId,
        userId: memberRecord.userId,
        email: memberRecord.email,
        name: memberRecord.name || undefined,
        role: memberRecord.role as WorkspaceRole,
        joinedAt: memberRecord.joinedAt,
      }

      const { data: workspaceRecord } = await client.models.Workspace.get(contextSpec, {
        id: currentWorkspaceId,
      })

      const workspace: Workspace | null = workspaceRecord
        ? {
            id: workspaceRecord.id,
            name: workspaceRecord.name,
            slug: workspaceRecord.slug || '',
            description: workspaceRecord.description || undefined,
            ownerId: workspaceRecord.ownerId,
            isPersonal: workspaceRecord.isPersonal || false,
            memberCount: workspaceRecord.memberCount || 0,
            createdAt: workspaceRecord.createdAt,
            updatedAt: workspaceRecord.updatedAt,
          }
        : null

      const { data: subscription } = await client.models.WorkspaceSubscription.get(
        contextSpec,
        { workspaceId: currentWorkspaceId },
        { selectionSet: ['workspaceId', 'planId'] }
      )

      // Validate plan is one of our known plans
      let plan: Plan = 'free'
      if (subscription?.planId && (KNOWN_PLANS as readonly string[]).includes(subscription.planId)) {
        plan = subscription.planId as Plan
      }

      // Map workspace role to entitlements role
      let role: Role = 'user'
      if (membership.role === 'OWNER') {
        role = 'owner'
      } else if (membership.role === 'ADMIN') {
        role = 'admin'
      }

      return {
        plan,
        role,
        workspace,
        membership,
      }
    })
  } catch (error) {
    // If workspace/subscription lookup fails for any other reason, fail
    // closed to the free plan rather than surfacing a 500 to every
    // entitlements consumer.
    console.error('Failed to fetch workspace context:', error)
    return {
      plan: 'free',
      role: 'user',
      workspace: null,
      membership: null,
    }
  }
}

/**
 * Get just the subscription plan from workspace context
 *
 * @param event - H3 event from API route
 * @param workspaceId - explicit workspace id (see getWorkspaceContext)
 * @returns Current subscription plan
 */
export async function getWorkspacePlan(event: H3Event, workspaceId?: string): Promise<Plan> {
  const context = await getWorkspaceContext(event, workspaceId)
  return context.plan
}

/**
 * Get just the user role from workspace context
 *
 * @param event - H3 event from API route
 * @param workspaceId - explicit workspace id (see getWorkspaceContext)
 * @returns Current user role in workspace
 */
export async function getWorkspaceRole(event: H3Event, workspaceId?: string): Promise<Role> {
  const context = await getWorkspaceContext(event, workspaceId)
  return context.role
}
