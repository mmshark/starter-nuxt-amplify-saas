/**
 * Server Utility - getWorkspaceContext
 *
 * Fetch workspace context (subscription and membership) for the authenticated user.
 * Used by server-side entitlements to determine plan and role.
 */

import type { H3Event } from 'h3'
import type { Plan, Role } from '../../types/entitlements'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@starter-nuxt-amplify-saas/workspaces/types/workspaces'

interface WorkspaceContext {
  plan: Plan
  role: Role
  workspace: Workspace | null
  membership: WorkspaceMember | null
}

/**
 * Get workspace context for the current user
 *
 * @param event - H3 event from API route
 * @returns Workspace context with plan and role
 * @throws 401 if user is not authenticated
 */
export async function getWorkspaceContext(event: H3Event): Promise<WorkspaceContext> {
  // Get authenticated user from Auth Layer
  const { user, isAuthenticated } = useUser()

  if (!isAuthenticated.value || !user.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  // Get current workspace ID from cookie
  const currentWorkspaceId = getCookie(event, 'currentWorkspaceId')

  // If no workspace selected, return free plan with user role
  if (!currentWorkspaceId) {
    return {
      plan: 'free',
      role: 'user',
      workspace: null,
      membership: null,
    }
  }

  try {
    // Fetch workspace data from API
    const workspace = await $fetch<Workspace>(`/api/workspaces/${currentWorkspaceId}`, {
      headers: event.headers,
    })

    // Fetch user's membership in this workspace
    const members = await $fetch<WorkspaceMember[]>(`/api/workspaces/${currentWorkspaceId}/members`, {
      headers: event.headers,
    })

    const membership = members.find(m => m.userId === user.value?.id) || null

    // Extract plan from workspace subscription
    const planId = workspace?.subscription?.planId
    let plan: Plan = 'free'

    // Validate plan is one of our known plans
    if (planId === 'free' || planId === 'pro' || planId === 'enterprise') {
      plan = planId as Plan
    }

    // Map workspace role to entitlements role
    let role: Role = 'user'
    const workspaceRole: WorkspaceRole | null = membership?.role || null

    if (workspaceRole === 'OWNER') {
      role = 'owner'
    } else if (workspaceRole === 'ADMIN') {
      role = 'admin'
    }

    return {
      plan,
      role,
      workspace,
      membership,
    }
  } catch (error) {
    // If workspace fetch fails, return free plan with user role
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
 * @returns Current subscription plan
 */
export async function getWorkspacePlan(event: H3Event): Promise<Plan> {
  const context = await getWorkspaceContext(event)
  return context.plan
}

/**
 * Get just the user role from workspace context
 *
 * @param event - H3 event from API route
 * @returns Current user role in workspace
 */
export async function getWorkspaceRole(event: H3Event): Promise<Role> {
  const context = await getWorkspaceContext(event)
  return context.role
}
