import { describe, expect, it } from 'vitest'
import { getPlanPrice, isPortalManagedSubscription } from '../billingPlans'

describe('getPlanPrice', () => {
  const plan = { price: 10, monthlyPrice: 29, yearlyPrice: 290 }

  it('selects the monthly amount', () => {
    expect(getPlanPrice(plan, 'monthly')).toBe(29)
  })

  it('selects the yearly amount', () => {
    expect(getPlanPrice(plan, 'yearly')).toBe(290)
  })

  it('keeps controlled plans compatible with their unified price', () => {
    expect(getPlanPrice({ price: 42 }, 'yearly')).toBe(42)
  })
})

describe('isPortalManagedSubscription', () => {
  it.each(['active', 'trialing', 'past_due'])('routes %s subscriptions to the portal', (status) => {
    expect(isPortalManagedSubscription(status)).toBe(true)
  })

  it.each(['canceled', 'incomplete', null, undefined])('allows checkout for %s', (status) => {
    expect(isPortalManagedSubscription(status)).toBe(false)
  })
})
