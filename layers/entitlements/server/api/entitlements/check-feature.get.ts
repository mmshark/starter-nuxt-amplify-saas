/**
 * GET /api/entitlements/check-feature?feature=<feature>
 *
 * Check access to specific feature.
 * Returns whether user can access the requested feature.
 */

import { z } from 'zod'
import { planIncludesFeature, getRequiredPlan } from '../../../config/features'
import type { Feature, Plan } from '../../../types/entitlements'

const querySchema = z.object({
  feature: z.string(),
})

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

  // Validate query parameters
  const query = await getValidatedQuery(event, querySchema.parse)
  const feature = query.feature as Feature

  // TODO: Get plan from workspace subscription when Workspaces layer is implemented
  const currentPlan: Plan = 'free'

  // Check if current plan includes the feature
  const hasAccess = planIncludesFeature(currentPlan, feature)
  const requiredPlan = getRequiredPlan(feature)

  return {
    feature,
    hasAccess,
    currentPlan,
    requiredPlan,
  }
})
