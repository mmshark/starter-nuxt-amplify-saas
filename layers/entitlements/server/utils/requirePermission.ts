/**
 * Server Utility - requirePermission
 *
 * Validate permission or throw 403 error.
 * Use in API routes to enforce permission-based access control.
 */

import type { H3Event } from 'h3'
import type { Permission } from '../../types/entitlements'
import { ROLE_PERMISSIONS } from '../../config/permissions'

/**
 * Require a specific permission for API access
 *
 * @param event - H3 event from API route
 * @param permission - Required permission identifier
 * @throws 403 Forbidden if user lacks permission
 */
export async function requirePermission(event: H3Event, permission: Permission): Promise<void> {
  // Get authenticated user from Auth Layer
  const { user, isAuthenticated } = useUser()

  if (!isAuthenticated.value || !user.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  // TODO: Get role from workspace membership when Workspaces layer is implemented
  // For now, default to 'user' role
  const userRole = 'user' as const

  // Check if user's role grants the required permission
  const hasPermission = ROLE_PERMISSIONS[userRole]?.includes(permission) || false

  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Permission denied: ${permission} required`,
      data: {
        requiredPermission: permission,
        userRole,
      },
    })
  }
}
