import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils/auth'
import type { EventHandlerRequest, H3Event } from 'h3'
import { useEntitlementsServer } from '../../composables/useEntitlements'
import type { Plan } from '../../types/entitlements'

export const requirePlan = async (event: H3Event<EventHandlerRequest>, minPlan: Plan) => {
  // 1. Ensure authenticated
  await requireAuth(event)

  // 2. Check plan
  const { isPlanOrHigher, refresh } = useEntitlementsServer()

  // Refresh to ensure latest state
  await refresh()

  if (!isPlanOrHigher(minPlan)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Plan requirement not met. Requires ${minPlan} or higher.`,
      data: {
        code: 'PLAN_REQUIRED',
        requiredPlan: minPlan
      }
    })
  }
}
