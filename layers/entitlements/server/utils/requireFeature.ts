/**
 * Server Utility - requireFeature
 *
 * Validate feature access or throw 403 error with required plan details.
 * Use in API routes to enforce feature-based access control.
 */

import type { H3Event } from 'h3'
import type { Feature } from '../../types/entitlements'
import { PLAN_FEATURES, getRequiredPlan } from '../../config/features'
import { getWorkspacePlan } from './getWorkspaceContext'

/**
 * Require a specific feature for API access
 *
 * @param event - H3 event from API route
 * @param feature - Required feature identifier
 * @throws 403 Forbidden if user's plan doesn't include feature
 */
export async function requireFeature(event: H3Event, feature: Feature): Promise<void> {
  // Get subscription plan from workspace context
  const userPlan = await getWorkspacePlan(event)

  // Check if user's plan includes the required feature
  const hasFeature = PLAN_FEATURES[userPlan]?.includes(feature) || false

  if (!hasFeature) {
    const requiredPlan = getRequiredPlan(feature)

    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Feature access denied: ${feature} requires ${requiredPlan} plan`,
      data: {
        requiredFeature: feature,
        requiredPlan,
        currentPlan: userPlan,
      },
    })
  }
}
