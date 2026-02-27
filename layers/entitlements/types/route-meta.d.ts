import type { Feature, Permission, Plan } from './entitlements'

declare module 'vue-router' {
  interface RouteMeta {
    feature?: Feature
    permission?: Permission
    requiredPlan?: Plan
  }
}

export {}
