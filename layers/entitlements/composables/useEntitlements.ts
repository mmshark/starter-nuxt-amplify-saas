import { useUser } from '@starter-nuxt-amplify-saas/auth/composables/useUser'
// import { useBilling } from '@starter-nuxt-amplify-saas/billing/composables/useBilling'
import { createSharedComposable } from '@vueuse/core'
import { FEATURES, PLAN_FEATURES } from '../config/features'
import { ROLE_PERMISSIONS } from '../config/permissions'
import type { Feature, Permission, Plan, Role } from '../types/entitlements'

// Base state
const useEntitlementsState = () => ({
  loading: useState<boolean>('entitlements:loading', () => false),
  error: useState<string | null>('entitlements:error', () => null),
  lastUpdated: useState<number | null>('entitlements:lastUpdated', () => null)
})

const _useEntitlements = () => {
  const s = useEntitlementsState()
  const { userProfile, isAuthenticated } = useUser()
  // const { currentPlanId, initialized: billingInitialized } = useBilling()

  // TODO: Re-enable once billing layer is complete
  const currentPlanId = ref<string>('free')
  const billingInitialized = ref(true)

  // Derived state
  const plan = computed<Plan>(() => {
    const p = currentPlanId.value as Plan
    return ['free', 'pro', 'enterprise'].includes(p) ? p : 'free'
  })

  const role = computed<Role>(() => {
    const r = userProfile.value?.role as Role
    return ['user', 'admin', 'owner'].includes(r) ? r : 'user'
  })

  const features = computed<Feature[]>(() => {
    return PLAN_FEATURES[plan.value] || []
  })

  const permissions = computed<Permission[]>(() => {
    return ROLE_PERMISSIONS[role.value] || []
  })

  // Feature Checks
  const canAccessFeature = (feature: Feature): boolean => {
    // 1. Check if feature exists and is enabled
    const def = FEATURES[feature]
    if (!def || !def.enabled) return false

    // 2. Check if user has the feature in their plan
    return features.value.includes(feature)
  }

  const hasAllFeatures = (requiredFeatures: Feature[]): boolean => {
    return requiredFeatures.every(f => canAccessFeature(f))
  }

  const hasAnyFeature = (requiredFeatures: Feature[]): boolean => {
    return requiredFeatures.some(f => canAccessFeature(f))
  }

  const getRequiredPlan = (feature: Feature): Plan | null => {
    const def = FEATURES[feature]
    return def ? def.requiredPlan : null
  }

  // Permission Checks
  const hasPermission = (permission: Permission): boolean => {
    return permissions.value.includes(permission)
  }

  const hasAllPermissions = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.every(p => hasPermission(p))
  }

  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.some(p => hasPermission(p))
  }

  // Plan Checks
  const hasPlan = (requiredPlan: Plan): boolean => {
    return plan.value === requiredPlan
  }

  const isPlanOrHigher = (requiredPlan: Plan): boolean => {
    const plans: Plan[] = ['free', 'pro', 'enterprise']
    const currentIdx = plans.indexOf(plan.value)
    const requiredIdx = plans.indexOf(requiredPlan)
    return currentIdx >= requiredIdx
  }

  // Role Checks
  const hasRole = (requiredRole: Role): boolean => {
    return role.value === requiredRole
  }

  const isRoleOrHigher = (requiredRole: Role): boolean => {
    const roles: Role[] = ['user', 'admin', 'owner']
    const currentIdx = roles.indexOf(role.value)
    const requiredIdx = roles.indexOf(requiredRole)
    return currentIdx >= requiredIdx
  }

  // Refresh logic (mostly relies on upstream auth/billing refresh)
  const refresh = async () => {
    s.loading.value = true
    try {
      // In a real app, we might fetch overrides here
      s.lastUpdated.value = Date.now()
    } catch (e: any) {
      s.error.value = e.message
    } finally {
      s.loading.value = false
    }
  }

  return {
    // State
    plan,
    role,
    features,
    permissions,
    loading: readonly(s.loading),
    error: readonly(s.error),

    // Feature Checks
    canAccessFeature,
    hasAllFeatures,
    hasAnyFeature,
    getRequiredPlan,

    // Permission Checks
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,

    // Plan/Role Checks
    hasPlan,
    isPlanOrHigher,
    hasRole,
    isRoleOrHigher,

    // Methods
    refresh
  }
}

export const useEntitlements = createSharedComposable(_useEntitlements)

export const useEntitlementsServer = () => {
  if (import.meta.client) {
    throw new Error('useEntitlementsServer is server-only')
  }
  return _useEntitlements()
}
