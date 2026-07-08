/**
 * Server Utility - requirePermission
 *
 * Validate permission or throw 403 error.
 * Use in API routes to enforce permission-based access control.
 */

import type { H3Event } from 'h3'
import type { Permission } from '../../types/entitlements'
import { ROLE_PERMISSIONS } from '../../config/permissions'
import { getWorkspaceRole } from './getWorkspaceContext'

/**
 * Require a specific permission for API access
 *
 * @param event - H3 event from API route
 * @param permission - Required permission identifier
 * @param workspaceId - explicit workspace id to check the role against,
 *   instead of the `current-workspace-id` cookie. Pass this whenever the
 *   route operates on a caller-supplied `workspaceId` (e.g. billing
 *   checkout/portal) — otherwise the permission check would be evaluated
 *   against whatever workspace the UI happens to have "selected" in a
 *   cookie, not the workspace actually being acted on.
 * @throws 403 Forbidden if user lacks permission
 */
export async function requirePermission(event: H3Event, permission: Permission, workspaceId?: string): Promise<void> {
  // Get user role from workspace context
  const userRole = await getWorkspaceRole(event, workspaceId)

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
