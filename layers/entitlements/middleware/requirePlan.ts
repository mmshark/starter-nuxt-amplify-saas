import { useEntitlements } from '../composables/useEntitlements'
import type { Plan } from '../types/entitlements'

export default defineNuxtRouteMiddleware((to) => {
  const { isPlanOrHigher } = useEntitlements()

  const requiredPlan = to.meta.requiredPlan as Plan | undefined

  if (!requiredPlan) return

  if (!isPlanOrHigher(requiredPlan)) {
    // Redirect to upgrade page
    return navigateTo({
      path: '/settings/billing',
      query: {
        error: 'plan_required',
        plan: requiredPlan
      }
    })
  }
})
