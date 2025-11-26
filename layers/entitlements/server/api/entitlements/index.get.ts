/**
 * GET /api/entitlements
 *
 * Get current user entitlements and permissions.
 * Returns complete entitlements state for authenticated user.
 */

import { PLAN_FEATURES } from '../../../config/features'
import { ROLE_PERMISSIONS } from '../../../config/permissions'
import type { Plan, Role } from '../../../types/entitlements'

export default defineEventHandler(async (event) => {
  // Require authentication
  const { user, isAuthenticated } = useUser()

  if (!isAuthenticated.value || !user.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  // TODO: Get plan from workspace subscription when Workspaces layer is implemented
  const currentPlan: Plan = 'free'

  // TODO: Get role from workspace membership when Workspaces layer is implemented
  const currentRole: Role = 'user'

  // Get features and permissions for current plan/role
  const features = PLAN_FEATURES[currentPlan] || []
  const permissions = ROLE_PERMISSIONS[currentRole] || []

  return {
    plan: currentPlan,
    role: currentRole,
    features,
    permissions,
    isAuthenticated: true,
  }
})
