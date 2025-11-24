import type { EventHandlerRequest, H3Event } from 'h3'
import type { Feature } from '../../types/entitlements'
import { requireFeature } from './requireFeature'

export const withFeature = <T = any>(
  feature: Feature,
  handler: (event: H3Event<EventHandlerRequest>) => Promise<T> | T
) => {
  return defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
    await requireFeature(event, feature)
    return await handler(event)
  })
}
