/**
 * Feature Middleware
 *
 * Protect routes based on feature entitlements.
 * Usage: definePageMeta({ middleware: ['auth', 'feature'], feature: 'advanced-analytics' })
 */

import type { Feature } from '../types/entitlements'

export default defineNuxtRouteMiddleware((to) => {
  const { canAccessFeature, isAuthenticated, getRequiredPlanForFeature } = useEntitlements()

  // Ensure user is authenticated first
  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath },
    })
  }

  // Get required feature from route meta
  const requiredFeature = to.meta.feature as Feature | undefined

  if (!requiredFeature) {
    console.warn('[feature middleware] No feature specified in route meta')
    return
  }

  // Check if user can access the required feature
  if (!canAccessFeature(requiredFeature)) {
    const requiredPlan = getRequiredPlanForFeature(requiredFeature)
    return navigateTo({
      path: '/upgrade',
      query: {
        feature: requiredFeature,
        plan: requiredPlan,
      },
    })
  }
})
