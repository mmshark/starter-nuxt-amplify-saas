import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';

/**
 * Example router demonstrating tRPC patterns
 *
 * This router contains example procedures showing how to:
 * - Create public procedures (no auth required)
 * - Create protected procedures (auth required)
 * - Use Zod for input/output validation
 * - Handle errors properly
 * - Structure complex data
 */
const exampleRouter = router({
  // Public procedure - no authentication required
  hello: publicProcedure
    .input(
      z.object({
        text: z.string().optional(),
      }),
    )
    .output(
      z.object({
        greeting: z.string(),
        timestamp: z.date(),
      })
    )
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text ?? 'World'}!`,
        timestamp: new Date(),
      }
    }),

  // Protected procedure - authentication required
  me: protectedProcedure
    .output(
      z.object({
        id: z.string(),
        message: z.string(),
        isAuthenticated: z.boolean(),
      }).nullable()
    )
    .query(({ ctx }) => {
      // TODO: Return actual user data when Amplify integration is complete
      return {
        id: 'example-user-id',
        message: 'This is a protected endpoint - user would be authenticated',
        isAuthenticated: true,
      }
    }),

  // Example mutation - shows how to handle data changes
  updateExample: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          updatedAt: z.date(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Integrate with Amplify data operations
      // Example of how this might look:
      /*
      const result = await withAmplifyAuth(ctx.event, async (contextSpec) => {
        const client = generateClient<Schema>({ authMode: 'userPool' })
        return await client.models.UserProfile.update(contextSpec, {
          userId: ctx.user.id,
          name: input.name,
          // ... other fields
        })
      })
      */

      // Mock implementation for now
      return {
        success: true,
        data: {
          id: 'example-id',
          name: input.name,
          email: input.email,
          updatedAt: new Date(),
        },
      }
    }),
})

/**
 * Main application router
 *
 * Add new routers here as you create them:
 * - billing: router with subscription, payment, and plan procedures
 * - auth: router with authentication procedures
 * - user: router with user management procedures
 * - etc.
 */
import { entitlementsRouter } from '@starter-nuxt-amplify-saas/entitlements/server/trpc/routers/entitlements';
import { workspacesRouter } from '@starter-nuxt-amplify-saas/workspaces/server/trpc/routers/workspaces';

// ... (existing code)

export const appRouter = router({
  // Example router - remove once you have real routers
  example: exampleRouter,

  entitlements: entitlementsRouter,
  workspaces: workspacesRouter,

  // TODO: Add real routers here
  // billing: billingRouter,
  // auth: authRouter,
  // user: userRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter
