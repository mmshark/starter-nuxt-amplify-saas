/**
 * tRPC type exports
 *
 * Export types from tRPC routers for use throughout the application
 * This allows you to use tRPC types in your components and composables
 */

// Re-export tRPC types that might be useful
export type { TRPCError } from '@trpc/server'

// Utility types for working with tRPC
export type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

// NOTE: AppRouter is no longer exported from here to avoid circular dependencies.
// Apps should define their own AppRouter and use module augmentation or specific types.
// export type { AppRouter } from '../server/trpc/routers'
