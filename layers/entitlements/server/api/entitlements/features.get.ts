/**
 * GET /api/entitlements/features
 *
 * List all available features with access status.
 * Returns complete feature catalog with user's access status for each.
 */

import { FEATURES, planIncludesFeature } from '../../../config/features'
import type { Plan } from '../../../types/entitlements'

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

  // Build feature list with access status
  const features = Object.values(FEATURES).map(feature => ({
    ...feature,
    hasAccess: planIncludesFeature(currentPlan, feature.id),
  }))

  return {
    currentPlan,
    features,
  }
})
