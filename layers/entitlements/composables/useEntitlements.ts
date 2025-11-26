/**
 * Entitlements Layer - useEntitlements Composable
 *
 * Universal composable for permission checking and feature access control.
 * Works across client, SSR, and API route contexts.
 *
 * TODO: Update to use workspace-level subscriptions once Workspaces layer is implemented.
 * Currently uses user-level subscriptions as temporary implementation.
 */

import type { Feature, Permission, Plan, Role } from '../types/entitlements'
import { PLAN_FEATURES, planIncludesFeature } from '../config/features'
import { ROLE_PERMISSIONS, roleHasPermission } from '../config/permissions'

export const useEntitlements = createSharedComposable(() => {
  const { user, isAuthenticated } = useUser()

  /**
   * Current subscription plan
   * TODO: Get from workspace subscription when Workspaces layer is implemented
   * Currently falling back to 'free' for all users
   */
  const subscriptionPlan = computed<Plan>(() => {
    if (!isAuthenticated.value || !user.value) {
      return 'free'
    }

    // TODO: Replace with workspace subscription lookup
    // const { currentWorkspace } = useWorkspaces()
    // return currentWorkspace.value?.subscription?.planId || 'free'

    // Temporary: Default to 'free' until workspace subscriptions are implemented
    return 'free'
  })

  /**
   * Current user role
   * TODO: Get from workspace membership when Workspaces layer is implemented
   * Currently defaults to 'user'
   */
  const userRole = computed<Role>(() => {
    if (!isAuthenticated.value || !user.value) {
      return 'user'
    }

    // TODO: Replace with workspace role lookup
    // const { currentWorkspace, currentMembership } = useWorkspaces()
    // return currentMembership.value?.role || 'user'

    // Temporary: Default to 'user' until workspace memberships are implemented
    return 'user'
  })

  /**
   * List of features available in current plan
   */
  const availableFeatures = computed<Feature[]>(() => {
    return PLAN_FEATURES[subscriptionPlan.value] || []
  })

  /**
   * List of permissions granted to current role
   */
  const grantedPermissions = computed<Permission[]>(() => {
    return ROLE_PERMISSIONS[userRole.value] || []
  })

  /**
   * Check if user can access a specific feature based on their subscription plan
   *
   * @param feature - Feature identifier to check
   * @returns true if user's plan includes the feature
   */
  const canAccessFeature = (feature: Feature): boolean => {
    return planIncludesFeature(subscriptionPlan.value, feature)
  }

  /**
   * Check if user has a specific permission based on their role
   *
   * @param permission - Permission identifier to check
   * @returns true if user's role grants the permission
   */
  const hasPermission = (permission: Permission): boolean => {
    return roleHasPermission(userRole.value, permission)
  }

  /**
   * Check if user has at least the specified role
   * Role hierarchy: user < admin < owner
   *
   * @param role - Minimum role required
   * @returns true if user's role is equal or higher
   */
  const hasRole = (role: Role): boolean => {
    const roleHierarchy: Record<Role, number> = {
      user: 1,
      admin: 2,
      owner: 3,
    }

    return roleHierarchy[userRole.value] >= roleHierarchy[role]
  }

  /**
   * Check if user's plan meets minimum requirement
   * Plan hierarchy: free < pro < enterprise
   *
   * @param minPlan - Minimum plan required
   * @returns true if user's plan is equal or higher
   */
  const hasPlan = (minPlan: Plan): boolean => {
    const planHierarchy: Record<Plan, number> = {
      free: 1,
      pro: 2,
      enterprise: 3,
    }

    return planHierarchy[subscriptionPlan.value] >= planHierarchy[minPlan]
  }

  /**
   * Get required plan for a feature
   *
   * @param feature - Feature identifier
   * @returns Minimum plan required for the feature
   */
  const getRequiredPlanForFeature = (feature: Feature): Plan => {
    // Find the lowest plan that includes this feature
    const plans: Plan[] = ['free', 'pro', 'enterprise']
    for (const plan of plans) {
      if (planIncludesFeature(plan, feature)) {
        return plan
      }
    }
    return 'enterprise' // Default to highest plan if not found
  }

  return {
    // State
    subscriptionPlan: readonly(subscriptionPlan),
    userRole: readonly(userRole),
    availableFeatures: readonly(availableFeatures),
    grantedPermissions: readonly(grantedPermissions),
    isAuthenticated: readonly(isAuthenticated),

    // Methods
    canAccessFeature,
    hasPermission,
    hasRole,
    hasPlan,
    getRequiredPlanForFeature,
  }
})
