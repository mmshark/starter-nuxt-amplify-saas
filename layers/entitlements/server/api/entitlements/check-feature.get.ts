/**
 * GET /api/entitlements/check-feature?feature=<feature>
 *
 * Check access to specific feature.
 * Returns whether user can access the requested feature.
 */

import { z } from 'zod'
import { planIncludesFeature, getRequiredPlan } from '../../../config/features'
import type { Feature } from '../../../types/entitlements'
import { getWorkspaceContext } from '../../utils/getWorkspaceContext'

const querySchema = z.object({
  feature: z.string(),
})

export default defineEventHandler(async (event) => {
  // Validate query parameters
  const query = await getValidatedQuery(event, querySchema.parse)
  const feature = query.feature as Feature

  // Get plan from workspace subscription
  const { plan: currentPlan } = await getWorkspaceContext(event)

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
