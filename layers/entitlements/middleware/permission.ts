import { useEntitlements } from '../composables/useEntitlements'
import type { Permission } from '../types/entitlements'

export default defineNuxtRouteMiddleware((to) => {
  const { hasPermission, hasAllPermissions } = useEntitlements()

  const permission = to.meta.permission as Permission | Permission[] | undefined

  if (!permission) return

  const hasAccess = Array.isArray(permission)
    ? hasAllPermissions(permission)
    : hasPermission(permission)

  if (!hasAccess) {
    // Redirect to dashboard with error
    return navigateTo({
      path: '/dashboard',
      query: {
        error: 'permission_denied',
        required: Array.isArray(permission) ? permission.join(',') : permission
      }
    })
  }
})
