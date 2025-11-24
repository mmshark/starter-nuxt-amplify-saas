/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn how to create protected base procedures and other things below:
 * @see https://trpc.io/docs/v10/router
 * @see https://trpc.io/docs/v10/procedures
 */
import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({
  errorFormatter({ error, shape }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error && error.cause.name === 'ZodError'
          ? error.cause
          : null,
      },
    }
  },
})

/**
 * Unprotected procedure - can be called by anyone
 * Use for public endpoints like getting subscription plans, health checks, etc.
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication
 *
 * TODO: Implement authentication check with Amplify
 * This middleware should check if the user is authenticated and throw an error if not
 */
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    })
  }

  return next({
    ctx: {
      ...ctx,
      // Ensure user is defined in protected procedures
      user: ctx.user,
      session: ctx.session,
    },
  })
})

/**
 * Protected procedure - only authenticated users can call
 * Use for user-specific endpoints like getting user subscription, updating profile, etc.
 */
export const protectedProcedure = t.procedure.use(isAuthenticated)

/**
 * Router factory - use this to create new routers
 */
export const router = t.router

/**
 * Middleware factory - use this to create custom middleware
 */
export const middleware = t.middleware
