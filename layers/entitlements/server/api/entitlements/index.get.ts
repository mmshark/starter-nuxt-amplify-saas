/**
 * GET /api/entitlements
 *
 * Get current user entitlements and permissions.
 * Returns complete entitlements state for authenticated user.
 */

import { PLAN_FEATURES } from '../../../config/features'
import { ROLE_PERMISSIONS } from '../../../config/permissions'
import { getWorkspaceContext } from '../../../server/utils/getWorkspaceContext'

export default defineEventHandler(async (event) => {
  // Get workspace context (includes authentication check)
  const { plan, role } = await getWorkspaceContext(event)

  // Get features and permissions for current plan/role
  const features = PLAN_FEATURES[plan] || []
  const permissions = ROLE_PERMISSIONS[role] || []

  return {
    plan,
    role,
    features,
    permissions,
    isAuthenticated: true,
  }
})
