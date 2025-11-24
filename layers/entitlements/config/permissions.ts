import type { RolePermissions } from '../types/entitlements'
import { definePermissions } from '../utils/definePermissions'

export const PERMISSIONS = definePermissions({
  'view-dashboard': {
    name: 'View Dashboard',
    description: 'Can view the dashboard',
    requiredRole: 'user'
  },
  'manage-profile': {
    name: 'Manage Profile',
    description: 'Can edit own profile',
    requiredRole: 'user'
  },
  'view-billing': {
    name: 'View Billing',
    description: 'Can view billing information',
    requiredRole: 'user'
  },
  'view-analytics': {
    name: 'View Analytics',
    description: 'Can view analytics data',
    requiredRole: 'user'
  },
  'access-api': {
    name: 'Access API',
    description: 'Can access the API',
    requiredRole: 'user'
  },
  'manage-users': {
    name: 'Manage Users',
    description: 'Can invite and remove users',
    requiredRole: 'admin'
  },
  'manage-settings': {
    name: 'Manage Settings',
    description: 'Can change workspace settings',
    requiredRole: 'admin'
  },
  'manage-billing': {
    name: 'Manage Billing',
    description: 'Can change subscription and payment methods',
    requiredRole: 'owner'
  },
  'export-data': {
    name: 'Export Data',
    description: 'Can export system data',
    requiredRole: 'owner'
  }
})

export const ROLE_PERMISSIONS: RolePermissions = {
  user: [
    'view-dashboard',
    'manage-profile',
    'view-billing',
    'view-analytics',
    'access-api'
  ],
  admin: [
    'view-dashboard',
    'manage-profile',
    'view-billing',
    'view-analytics',
    'access-api',
    'manage-users',
    'manage-settings'
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
    'export-data'
  ]
}
