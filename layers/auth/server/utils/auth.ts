import type { H3Event, EventHandlerRequest } from 'h3'
import { fetchAuthSession } from 'aws-amplify/auth/server'
import { withAmplifyAuth } from '@mmshark/amplify-layer/server/utils/amplify'

/**
 * Authenticated user shape attached to `event.context.user` by `requireAuth`.
 */
export interface AuthUser {
  userId: string
  email?: string
}

/**
 * Direct authentication function for server API routes (Nitro).
 *
 * Runs entirely inside the Amplify SSR server context derived from the
 * request's cookies (`withAmplifyAuth` + `fetchAuthSession`). It does NOT
 * depend on `useUserServer()`/`useNuxtApp()` — those throw when called from
 * a bare Nitro `server/api/*.ts` handler, since there is no Nuxt app
 * instance outside of a page/SSR request. This is what makes
 * `requireAuth`/`withAuth` safe to use from ANY server route (previously
 * only routes reached through the `/api/workspaces/*` middleware — which
 * itself duplicates this same Amplify SSR check — had `event.context.user`
 * populated at all).
 *
 * @param event - H3Event from the API route
 * @returns the authenticated user's id + email
 * @throws createError with 401 if no valid session is present
 */
export const requireAuth = async (
  event: H3Event<EventHandlerRequest>
): Promise<AuthUser> => {
  return await withAmplifyAuth(event, async (contextSpec) => {
    const session = await fetchAuthSession(contextSpec)

    if (!session.tokens) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const user: AuthUser = {
      userId: session.userSub as string,
      email: session.tokens.idToken?.payload.email as string | undefined
    }

    event.context.user = user

    return user
  })
}

/**
 * Higher-order function that wraps an event handler with authentication
 *
 * @param handler - The event handler function to wrap
 * @returns A new event handler that requires authentication
 *
 * @example
 * ```typescript
 * export default withAuth(async (event) => {
 *   const user = event.context.user // Already authenticated
 *
 *   // Your endpoint logic here...
 *   return { data: 'protected data' }
 * })
 * ```
 */
export const withAuth = <T = any>(
  handler: (event: H3Event<EventHandlerRequest> & { context: { user: AuthUser } }) => Promise<T> | T
) => {
  return defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
    // Apply authentication first
    await requireAuth(event)

    // Execute the original handler
    return await handler(event as any)
  })
}
