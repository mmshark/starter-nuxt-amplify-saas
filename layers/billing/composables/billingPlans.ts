export type BillingInterval = 'monthly' | 'yearly'

export interface IntervalPlan {
  price?: number
  monthlyPrice?: number
  yearlyPrice?: number
}

export const PORTAL_MANAGED_SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
  'past_due'
] as const

export function getPlanPrice(plan: IntervalPlan, interval: BillingInterval): number | undefined {
  if (interval === 'yearly') {
    return plan.yearlyPrice ?? plan.price
  }

  return plan.monthlyPrice ?? plan.price
}

export function isPortalManagedSubscription(status?: string | null): boolean {
  return PORTAL_MANAGED_SUBSCRIPTION_STATUSES.includes(
    status as typeof PORTAL_MANAGED_SUBSCRIPTION_STATUSES[number]
  )
}
