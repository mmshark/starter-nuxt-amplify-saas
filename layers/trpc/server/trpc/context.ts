import type { inferAsyncReturnType } from '@trpc/server'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth/server'
import type { H3Event } from 'h3'
import { withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

interface CreateNuxtContextOptions {
  event: H3Event
}

/**
 * Creates context for an incoming tRPC request
 *
 * This context will be available in all procedures and can contain:
 * - User authentication information
 * - Database connections
 * - Request/response objects
 * - Any other data needed across procedures
 *
 * @link https://trpc.io/docs/context
 */
export const createContext = async (opts: CreateNuxtContextOptions) => {
  const { event } = opts

  // Integrate with Amplify authentication
  const authContext = await withAmplifyAuth(event, async (contextSpec) => {
    try {
      const session = await fetchAuthSession(contextSpec)
      const user = session.tokens ? await getCurrentUser(contextSpec) : null
      return { user, session, contextSpec }
    } catch (e) {
      return { user: null, session: null, contextSpec }
    }
  }).catch(() => ({ user: null, session: null, contextSpec: null }))

  return {
    // H3 event object - contains request/response and headers
    event,

    // User authentication
    user: authContext.user,
    session: authContext.session,
    contextSpec: authContext.contextSpec,
  }
}

export type Context = inferAsyncReturnType<typeof createContext>
