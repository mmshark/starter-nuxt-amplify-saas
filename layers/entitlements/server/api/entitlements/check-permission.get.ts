/**
 * GET /api/entitlements/check-permission?permission=<permission>
 *
 * Check specific permission.
 * Returns whether user has the requested permission.
 */

import { z } from 'zod'
import { roleHasPermission, getRequiredRole } from '../../../config/permissions'
import type { Permission } from '../../../types/entitlements'
import { getWorkspaceContext } from '../../utils/getWorkspaceContext'

const querySchema = z.object({
  permission: z.string(),
})

export default defineEventHandler(async (event) => {
  // Validate query parameters
  const query = await getValidatedQuery(event, querySchema.parse)
  const permission = query.permission as Permission

  // Get role from workspace membership
  const { role: currentRole } = await getWorkspaceContext(event)

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
