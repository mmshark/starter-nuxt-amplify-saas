export type Plan = 'free' | 'pro' | 'enterprise'
export type Role = 'user' | 'admin' | 'owner'

// Feature identifiers
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

// Permission identifiers
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

export interface FeatureDefinition {
  id: Feature
  name: string
  description?: string
  requiredPlan: Plan
  enabled: boolean
  beta?: boolean
}

export interface PermissionDefinition {
  id: Permission
  name: string
  description?: string
  requiredRole: Role
}

export interface EntitlementsState {
  plan: Plan
  role: Role
  features: Feature[]
  permissions: Permission[]
  loading: boolean
  error: string | null
  lastUpdated: number | null
}

export type PlanFeatures = Record<Plan, Feature[]>
export type RolePermissions = Record<Role, Permission[]>
