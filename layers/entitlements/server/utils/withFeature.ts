/**
 * Server Utility - withFeature
 *
 * Higher-order function wrapper for feature-gated endpoints.
 * Automatically validates feature access before executing handler.
 */

import type { H3Event, EventHandler } from 'h3'
import type { Feature } from '../../types/entitlements'
import { requireFeature } from './requireFeature'

/**
 * Wrap an event handler with feature validation
 *
 * @param handler - Original event handler
 * @param feature - Required feature
 * @returns Wrapped handler with automatic feature check
 *
 * @example
 * export default withFeature(
 *   async (event) => {
 *     // Handler code here - only executes if feature is accessible
 *     return { data: 'premium feature data' }
 *   },
 *   'advanced-analytics'
 * )
 */
export function withFeature<T>(
  handler: EventHandler<T>,
  feature: Feature
): EventHandler<T> {
  return async (event: H3Event): Promise<T> => {
    // Validate feature access first
    await requireFeature(event, feature)

    // Feature access granted - execute original handler
    return handler(event)
  }
}
