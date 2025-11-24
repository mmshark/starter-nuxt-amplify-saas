import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '@starter-nuxt-amplify-saas/trpc/server/trpc/trpc'
import { useEntitlementsServer } from '../../../composables/useEntitlements'
import { FEATURES } from '../../../config/features'
import type { Feature, Permission } from '../../../types/entitlements'

export const entitlementsRouter = router({
  // Get current user entitlements
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const {
        plan,
        role,
        features,
        permissions,
        refresh
      } = useEntitlementsServer()

      // Ensure latest state
      // Note: In a real implementation, we'd pass the event/context to refresh
      // but useEntitlementsServer uses useUserServer which uses the global H3 event if available
      // or we might need to pass it explicitly if the composable doesn't auto-detect
      await refresh()

      return {
        plan: plan.value,
        role: role.value,
        features: features.value,
        permissions: permissions.value
      }
    }),

  // Check access to specific feature
  checkFeature: protectedProcedure
    .input(z.object({
      feature: z.string()
    }))
    .query(async ({ input }) => {
      const { canAccessFeature, refresh } = useEntitlementsServer()
      await refresh()

      return {
        allowed: canAccessFeature(input.feature as Feature)
      }
    }),

  // Check specific permission
  checkPermission: protectedProcedure
    .input(z.object({
      permission: z.string()
    }))
    .query(async ({ input }) => {
      const { hasPermission, refresh } = useEntitlementsServer()
      await refresh()

      return {
        allowed: hasPermission(input.permission as Permission)
      }
    }),

  // List all available features
  listFeatures: publicProcedure
    .query(() => {
      return Object.values(FEATURES).map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        requiredPlan: f.requiredPlan
      }))
    })
})
