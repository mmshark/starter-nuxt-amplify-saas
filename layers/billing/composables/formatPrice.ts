/**
 * Shared price formatter for the billing layer.
 *
 * `SubscriptionPlan.monthlyPrice` / `.yearlyPrice` are stored as DECIMAL
 * DOLLARS in DynamoDB (see `apps/backend/amplify/seed/seeders/plans.ts`,
 * which converts Stripe's cent amounts via `centsToDecimal` before writing).
 * Do NOT divide by 100 here — that was the source of the 100x price bug
 * across the pricing components (review H1).
 *
 * Every component that renders a plan price (PricingPlan, PricingPlans,
 * PricingTable, CurrentSubscription) must use this single implementation so
 * the formatting can't diverge again.
 */
export function formatPrice(value: number | null | undefined, currency?: string | null): string {
  const amount = value ?? 0

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}
