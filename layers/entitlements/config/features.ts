/**
 * Entitlements Layer - Feature Definitions
 *
 * Defines the catalog of features and their plan requirements.
 * Higher plans inherit all features from lower plans.
 */

import type { Feature, FeatureDefinition, Plan, PlanFeatures } from '../types/entitlements'

/**
 * Complete feature catalog with metadata
 */
export const FEATURES: Record<Feature, FeatureDefinition> = {
  'basic-dashboard': {
    id: 'basic-dashboard',
    name: 'Basic Dashboard',
    description: 'Access to basic dashboard functionality',
    requiredPlan: 'free',
    enabled: true,
  },
  'advanced-analytics': {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    description: 'Detailed analytics and reporting',
    requiredPlan: 'pro',
    enabled: true,
  },
  'audit-logs': {
    id: 'audit-logs',
    name: 'Audit Logs',
    description: 'Complete audit trail of system activities',
    requiredPlan: 'pro',
    enabled: true,
  },
  'data-export': {
    id: 'data-export',
    name: 'Data Export',
    description: 'Export data in various formats',
    requiredPlan: 'pro',
    enabled: true,
  },
  'webhooks': {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Configure webhooks for events',
    requiredPlan: 'pro',
    enabled: true,
  },
  'api-access': {
    id: 'api-access',
    name: 'API Access',
    description: 'Full API access with authentication',
    requiredPlan: 'enterprise',
    enabled: true,
  },
  'priority-support': {
    id: 'priority-support',
    name: 'Priority Support',
    description: 'Dedicated support with priority response',
    requiredPlan: 'enterprise',
    enabled: true,
  },
  'custom-branding': {
    id: 'custom-branding',
    name: 'Custom Branding',
    description: 'White-label the application',
    requiredPlan: 'enterprise',
    enabled: true,
  },
  'sso': {
    id: 'sso',
    name: 'Single Sign-On (SSO)',
    description: 'Enterprise SSO integration',
    requiredPlan: 'enterprise',
    enabled: true,
  },
  'custom-integrations': {
    id: 'custom-integrations',
    name: 'Custom Integrations',
    description: 'Build custom integrations',
    requiredPlan: 'enterprise',
    enabled: true,
  },
}

/**
 * Plan-to-features mapping
 * Higher plans inherit all features from lower plans
 */
export const PLAN_FEATURES: PlanFeatures = {
  free: ['basic-dashboard'],
  pro: [
    'basic-dashboard',
    'advanced-analytics',
    'audit-logs',
    'data-export',
    'webhooks',
  ],
  enterprise: [
    'basic-dashboard',
    'advanced-analytics',
    'audit-logs',
    'data-export',
    'webhooks',
    'api-access',
    'priority-support',
    'custom-branding',
    'sso',
    'custom-integrations',
  ],
}

/**
 * Get features for a specific plan
 */
export function getFeaturesForPlan(plan: Plan): Feature[] {
  return PLAN_FEATURES[plan] || []
}

/**
 * Check if a plan includes a specific feature
 */
export function planIncludesFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) || false
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlan(feature: Feature): Plan {
  return FEATURES[feature]?.requiredPlan || 'enterprise'
}
