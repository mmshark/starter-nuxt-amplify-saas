import type { PlanFeatures } from '../types/entitlements'
import { defineFeatures } from '../utils/defineFeatures'

export const FEATURES = defineFeatures({
  'basic-dashboard': {
    name: 'Basic Dashboard',
    description: 'Access to the main dashboard',
    requiredPlan: 'free',
    enabled: true
  },
  'advanced-analytics': {
    name: 'Advanced Analytics',
    description: 'Detailed analytics and reporting',
    requiredPlan: 'pro',
    enabled: true
  },
  'audit-logs': {
    name: 'Audit Logs',
    description: 'View system activity logs',
    requiredPlan: 'pro',
    enabled: true
  },
  'data-export': {
    name: 'Data Export',
    description: 'Export data to CSV/JSON',
    requiredPlan: 'pro',
    enabled: true
  },
  'webhooks': {
    name: 'Webhooks',
    description: 'Configure webhooks for events',
    requiredPlan: 'pro',
    enabled: true
  },
  'api-access': {
    name: 'API Access',
    description: 'Access to the REST/GraphQL API',
    requiredPlan: 'enterprise',
    enabled: true
  },
  'priority-support': {
    name: 'Priority Support',
    description: '24/7 priority support',
    requiredPlan: 'enterprise',
    enabled: true
  },
  'custom-branding': {
    name: 'Custom Branding',
    description: 'Remove branding and use custom logo',
    requiredPlan: 'enterprise',
    enabled: true
  },
  'sso': {
    name: 'Single Sign-On (SSO)',
    description: 'SAML/OIDC SSO integration',
    requiredPlan: 'enterprise',
    enabled: true
  },
  'custom-integrations': {
    name: 'Custom Integrations',
    description: 'Custom integration development',
    requiredPlan: 'enterprise',
    enabled: true
  }
})

export const PLAN_FEATURES: PlanFeatures = {
  free: [
    'basic-dashboard'
  ],
  pro: [
    'basic-dashboard',
    'advanced-analytics',
    'audit-logs',
    'data-export',
    'webhooks'
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
    'custom-integrations'
  ]
}
