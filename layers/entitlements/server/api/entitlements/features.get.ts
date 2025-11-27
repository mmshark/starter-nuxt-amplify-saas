/**
 * GET /api/entitlements/features
 *
 * List all available features with access status.
 * Returns complete feature catalog with user's access status for each.
 */

import { FEATURES, planIncludesFeature } from '../../../config/features'
import { getWorkspacePlan } from '../../../server/utils/getWorkspaceContext'

export default defineEventHandler(async (event) => {
  // Get subscription plan from workspace context (includes authentication check)
  const currentPlan = await getWorkspacePlan(event)

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
