/**
 * Server Utility - withPermission
 *
 * Higher-order function wrapper for protected endpoints.
 * Automatically validates permission before executing handler.
 */

import type { H3Event, EventHandler } from 'h3'
import type { Permission } from '../../types/entitlements'
import { requirePermission } from './requirePermission'

/**
 * Wrap an event handler with permission validation
 *
 * @param handler - Original event handler
 * @param permission - Required permission
 * @returns Wrapped handler with automatic permission check
 *
 * @example
 * export default withPermission(
 *   async (event) => {
 *     // Handler code here - only executes if permission is granted
 *     return { data: 'protected resource' }
 *   },
 *   'manage-users'
 * )
 */
export function withPermission<T>(
  handler: EventHandler<T>,
  permission: Permission
): EventHandler<T> {
  return async (event: H3Event): Promise<T> => {
    // Validate permission first
    await requirePermission(event, permission)

    // Permission granted - execute original handler
    return handler(event)
  }
}
