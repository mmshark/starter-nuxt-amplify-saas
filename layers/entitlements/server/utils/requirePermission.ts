import { requireAuth } from '@starter-nuxt-amplify-saas/auth/server/utils/auth'
import type { EventHandlerRequest, H3Event } from 'h3'
import { useEntitlementsServer } from '../../composables/useEntitlements'
import type { Permission } from '../../types/entitlements'

export const requirePermission = async (event: H3Event<EventHandlerRequest>, permission: Permission) => {
  // 1. Ensure authenticated
  await requireAuth(event)

  // 2. Check permission
  const { hasPermission, refresh } = useEntitlementsServer()

  // Refresh to ensure latest state
  await refresh()

  if (!hasPermission(permission)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Missing required permission: ${permission}`
    })
  }
}
