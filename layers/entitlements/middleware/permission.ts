/**
 * Permission Middleware
 *
 * Protect routes based on user permissions.
 * Usage: definePageMeta({ middleware: ['auth', 'permission'], permission: 'manage-users' })
 */

import type { Permission } from '../types/entitlements'

export default defineNuxtRouteMiddleware((to) => {
  const { hasPermission, isAuthenticated } = useEntitlements()

  // Ensure user is authenticated first
  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath },
    })
  }

  // Get required permission from route meta
  const requiredPermission = to.meta.permission as Permission | undefined

  if (!requiredPermission) {
    console.warn('[permission middleware] No permission specified in route meta')
    return
  }

  // Check if user has the required permission
  if (!hasPermission(requiredPermission)) {
    return navigateTo({
      path: '/dashboard',
      query: { error: 'insufficient_permissions' },
    })
  }
})
