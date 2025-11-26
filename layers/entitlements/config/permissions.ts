/**
 * Entitlements Layer - Permission Definitions
 *
 * Defines the catalog of permissions and their role requirements.
 * Higher roles inherit all permissions from lower roles.
 */

import type { Permission, PermissionDefinition, Role, RolePermissions } from '../types/entitlements'

/**
 * Complete permission catalog with metadata
 */
export const PERMISSIONS: Record<Permission, PermissionDefinition> = {
  'view-dashboard': {
    id: 'view-dashboard',
    name: 'View Dashboard',
    description: 'Access to view dashboard',
    requiredRole: 'user',
  },
  'manage-profile': {
    id: 'manage-profile',
    name: 'Manage Profile',
    description: 'Edit user profile settings',
    requiredRole: 'user',
  },
  'view-billing': {
    id: 'view-billing',
    name: 'View Billing',
    description: 'View billing information',
    requiredRole: 'user',
  },
  'view-analytics': {
    id: 'view-analytics',
    name: 'View Analytics',
    description: 'Access analytics data',
    requiredRole: 'user',
  },
  'access-api': {
    id: 'access-api',
    name: 'Access API',
    description: 'Use API endpoints',
    requiredRole: 'user',
  },
  'manage-users': {
    id: 'manage-users',
    name: 'Manage Users',
    description: 'Add, edit, or remove users',
    requiredRole: 'admin',
  },
  'manage-settings': {
    id: 'manage-settings',
    name: 'Manage Settings',
    description: 'Configure system settings',
    requiredRole: 'admin',
  },
  'manage-billing': {
    id: 'manage-billing',
    name: 'Manage Billing',
    description: 'Manage billing and subscriptions',
    requiredRole: 'owner',
  },
  'export-data': {
    id: 'export-data',
    name: 'Export Data',
    description: 'Export all system data',
    requiredRole: 'owner',
  },
}

/**
 * Role-to-permissions mapping
 * Higher roles inherit all permissions from lower roles
 */
export const ROLE_PERMISSIONS: RolePermissions = {
  user: [
    'view-dashboard',
    'manage-profile',
    'view-billing',
    'view-analytics',
    'access-api',
  ],
  admin: [
    'view-dashboard',
    'manage-profile',
    'view-billing',
    'view-analytics',
    'access-api',
    'manage-users',
    'manage-settings',
  ],
  owner: [
    'view-dashboard',
    'manage-profile',
    'view-billing',
    'view-analytics',
    'access-api',
    'manage-users',
    'manage-settings',
    'manage-billing',
    'export-data',
  ],
}

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

/**
 * Get the minimum role required for a permission
 */
export function getRequiredRole(permission: Permission): Role {
  return PERMISSIONS[permission]?.requiredRole || 'owner'
}
