import { useEntitlements } from '../composables/useEntitlements'
import type { Feature } from '../types/entitlements'

export default defineNuxtRouteMiddleware((to) => {
  const { canAccessFeature, getRequiredPlan } = useEntitlements()

  const feature = to.meta.feature as Feature | undefined

  if (!feature) return

  if (!canAccessFeature(feature)) {
    const requiredPlan = getRequiredPlan(feature)

    // Redirect to upgrade page
    return navigateTo({
      path: '/settings/billing',
      query: {
        error: 'feature_locked',
        feature: feature,
        plan: requiredPlan
      }
    })
  }
})
