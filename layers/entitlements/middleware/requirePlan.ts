/**
 * RequirePlan Middleware
 *
 * Require specific subscription plan for route access.
 * Usage: definePageMeta({ middleware: ['auth', 'requirePlan'], requiredPlan: 'enterprise' })
 */

import type { Plan } from '../types/entitlements'

export default defineNuxtRouteMiddleware((to) => {
  const { hasPlan, isAuthenticated } = useEntitlements()

  // Ensure user is authenticated first
  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath },
    })
  }

  // Get required plan from route meta
  const requiredPlan = to.meta.requiredPlan as Plan | undefined

  if (!requiredPlan) {
    console.warn('[requirePlan middleware] No requiredPlan specified in route meta')
    return
  }

  // Check if user has the required plan or higher
  if (!hasPlan(requiredPlan)) {
    return navigateTo({
      path: '/upgrade',
      query: { plan: requiredPlan },
    })
  }
})
