import { withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth/server'
import { H3Error } from 'h3'

/**
 * Authentication middleware for protected API routes
 * Ensures the user is authenticated via Amplify
 */
export default defineEventHandler(async (event) => {
  // Only apply to /api/workspaces routes
  if (!event.path?.startsWith('/api/workspaces')) {
    return
  }

  try {
    const authContext = await withAmplifyAuth(event, async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec)
        const user = session.tokens ? await getCurrentUser(contextSpec) : null
        return { user, session }
      } catch (e) {
        return { user: null, session: null }
      }
    })

    if (!authContext.user || !authContext.session) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'You must be logged in to access this resource'
      })
    }

    // Attach user to event context for use in route handlers
    event.context.user = authContext.user
    event.context.session = authContext.session
  } catch (error) {
    if (error instanceof H3Error) {
      throw error
    }
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication failed'
    })
  }
})
