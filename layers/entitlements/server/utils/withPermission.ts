import type { EventHandlerRequest, H3Event } from 'h3'
import type { Permission } from '../../types/entitlements'
import { requirePermission } from './requirePermission'

export const withPermission = <T = any>(
  permission: Permission,
  handler: (event: H3Event<EventHandlerRequest>) => Promise<T> | T
) => {
  return defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
    await requirePermission(event, permission)
    return await handler(event)
  })
}
