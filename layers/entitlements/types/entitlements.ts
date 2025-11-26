/**
 * Entitlements Layer - TypeScript Type Definitions
 *
 * Defines types for authorization, feature access control, and role-based permissions.
 */

/**
 * Subscription plan tiers
 */
export type Plan = 'free' | 'pro' | 'enterprise'

/**
 * User roles for role-based access control
 */
export type Role = 'user' | 'admin' | 'owner'

/**
 * Feature identifiers for plan-based entitlements
 */
export type Feature =
  | 'basic-dashboard'
  | 'advanced-analytics'
  | 'api-access'
  | 'priority-support'
  | 'custom-branding'
  | 'audit-logs'
  | 'sso'
  | 'data-export'
  | 'webhooks'
  | 'custom-integrations'

/**
 * Permission identifiers for role-based access control
 */
export type Permission =
  | 'view-dashboard'
  | 'manage-profile'
  | 'view-billing'
  | 'manage-billing'
  | 'manage-users'
  | 'manage-settings'
  | 'view-analytics'
  | 'access-api'
  | 'export-data'

/**
 * Reactive entitlements state
 */
export interface EntitlementsState {
  plan: Plan
  role: Role
  features: Feature[]
  permissions: Permission[]
  loading: boolean
  error: Error | null
  lastUpdated: Date | null
}

/**
 * Feature definition with metadata
 */
export interface FeatureDefinition {
  id: Feature
  name: string
  description: string
  requiredPlan: Plan
  enabled: boolean
  beta?: boolean
}

/**
 * Permission definition with metadata
 */
export interface PermissionDefinition {
  id: Permission
  name: string
  description: string
  requiredRole: Role
}

/**
 * Mapping of plans to their included features
 */
export type PlanFeatures = Record<Plan, Feature[]>

/**
 * Mapping of roles to their granted permissions
 */
export type RolePermissions = Record<Role, Permission[]>
