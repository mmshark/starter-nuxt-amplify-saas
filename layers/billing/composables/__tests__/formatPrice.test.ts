import { describe, it, expect } from 'vitest'
import { formatPrice } from '../formatPrice'

// Regression guard for review finding H1: SubscriptionPlan prices are stored
// as DECIMAL DOLLARS, so formatPrice must NOT divide by 100. A Pro plan at 29
// must render as $29.00, never $0.29.
describe('formatPrice', () => {
  it('renders decimal dollars without a 100x reduction', () => {
    expect(formatPrice(29)).toBe('$29.00')
  })

  it('renders zero and null/undefined as $0.00', () => {
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(null)).toBe('$0.00')
    expect(formatPrice(undefined)).toBe('$0.00')
  })

  it('honours a non-default currency', () => {
    // Intl formats EUR with the euro sign; assert it is not USD.
    const out = formatPrice(10, 'EUR')
    expect(out).toContain('10')
    expect(out).not.toContain('$')
  })
})
