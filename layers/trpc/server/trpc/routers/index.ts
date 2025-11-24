import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';

/**
 * Example router demonstrating tRPC patterns
 */
const exampleRouter = router({
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
})

// Base routers that don't depend on other layers can be here
// But complex feature routers should be in their own layers

export const baseAppRouter = router({
  example: exampleRouter,
})

// Export type definition of Base API
export type BaseAppRouter = typeof baseAppRouter
