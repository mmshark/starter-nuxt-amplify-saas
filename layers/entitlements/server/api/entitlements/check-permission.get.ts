/**
 * GET /api/entitlements/check-permission?permission=<permission>
 *
 * Check specific permission.
 * Returns whether user has the requested permission.
 */

import { z } from 'zod'
import { roleHasPermission, getRequiredRole } from '../../../config/permissions'
import type { Permission, Role } from '../../../types/entitlements'

const querySchema = z.object({
  permission: z.string(),
})

export default defineEventHandler(async (event) => {
  // Require authentication
  const { user, isAuthenticated } = useUser()

  if (!isAuthenticated.value || !user.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  // Validate query parameters
  const query = await getValidatedQuery(event, querySchema.parse)
  const permission = query.permission as Permission

  // TODO: Get role from workspace membership when Workspaces layer is implemented
  const currentRole: Role = 'user'

  // Check if current role has the permission
  const hasPermission = roleHasPermission(currentRole, permission)
  const requiredRole = getRequiredRole(permission)

  return {
    permission,
    hasPermission,
    currentRole,
    requiredRole,
  }
})
