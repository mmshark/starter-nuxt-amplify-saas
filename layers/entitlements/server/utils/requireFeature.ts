import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils/auth'
import type { EventHandlerRequest, H3Event } from 'h3'
import { useEntitlementsServer } from '../../composables/useEntitlements'
import type { Feature } from '../../types/entitlements'

export const requireFeature = async (event: H3Event<EventHandlerRequest>, feature: Feature) => {
  // 1. Ensure authenticated
  await requireAuth(event)

  // 2. Check feature
  const { canAccessFeature, refresh, getRequiredPlan } = useEntitlementsServer()

  // Refresh to ensure latest state
  await refresh()

  if (!canAccessFeature(feature)) {
    const requiredPlan = getRequiredPlan(feature)
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Feature locked: ${feature}. Requires ${requiredPlan} plan.`,
      data: {
        code: 'FEATURE_LOCKED',
        feature,
        requiredPlan
      }
    })
  }
}
