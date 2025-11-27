/**
 * Server Utility - requirePlan
 *
 * Validate subscription plan or throw 403 error.
 * Use in API routes to enforce plan-based access control.
 */

import type { H3Event } from 'h3'
import type { Plan } from '../../types/entitlements'
import { getWorkspacePlan } from './getWorkspaceContext'

/**
 * Require a minimum subscription plan for API access
 *
 * @param event - H3 event from API route
 * @param minPlan - Minimum required plan
 * @throws 403 Forbidden if user's plan is lower than required
 */
export async function requirePlan(event: H3Event, minPlan: Plan): Promise<void> {
  // Get subscription plan from workspace context
  const userPlan = await getWorkspacePlan(event)

  // Plan hierarchy for comparison
  const planHierarchy: Record<Plan, number> = {
    free: 1,
    pro: 2,
    enterprise: 3,
  }

  const userPlanLevel = planHierarchy[userPlan] || 0
  const requiredPlanLevel = planHierarchy[minPlan] || 999

  if (userPlanLevel < requiredPlanLevel) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Subscription upgrade required: ${minPlan} plan or higher needed`,
      data: {
        requiredPlan: minPlan,
        currentPlan: userPlan,
      },
    })
  }
}
