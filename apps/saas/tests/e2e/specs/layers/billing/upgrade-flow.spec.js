import { test, expect } from '@playwright/test'
import { AuthHelpers } from '../../../helpers/auth.js'
import { StripeHelpers } from '../../../helpers/stripe.js'

const freeOwner = {
  email: 'test+free1@ontopix.ai',
  password: 'TestPassword123!'
}

const successfulCard = {
  number: '4242424242424242',
  expiryDate: '12/30',
  cvc: '123',
  name: 'E05 Test Owner',
  email: freeOwner.email,
  address: {
    line1: '123 Test Street',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94107',
    country: 'US'
  }
}

test.describe('Billing Layer - E05 upgrade flow', () => {
  test('switches intervals and upgrades a free workspace to Pro', async ({ page, request }) => {
    const plansResponse = await request.get('/api/billing/plans')
    expect(plansResponse.ok()).toBe(true)
    const catalog = await plansResponse.json()
    const pro = catalog.data.plans.find(plan => plan.id === 'pro')
    expect(pro).toBeDefined()
    expect(pro.trialPeriodDays).toBe(14)

    const auth = new AuthHelpers(page)
    await auth.login(freeOwner)
    expect(await auth.isLoggedIn()).toBe(true)

    await auth.goto('/settings/billing')
    await page.getByRole('link', { name: 'Upgrade' }).click()
    await expect(page).toHaveURL(/\/settings\/billing\/plans$/)

    await expect(page.getByText(`$${pro.monthlyPrice.toFixed(2)}`, { exact: true })).toBeVisible()
    await page.getByRole('switch', { name: 'Yearly billing' }).click()
    await expect(page.getByText(`$${pro.yearlyPrice.toFixed(2)}`, { exact: true })).toBeVisible()

    // Keep the payment assertion deterministic: E05's trial is configured on
    // Pro and Checkout must still collect a test payment method.
    await page.getByRole('switch', { name: 'Yearly billing' }).click()
    await page.getByRole('button', { name: 'Choose plan: Pro' }).click()
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30_000 })

    const stripe = new StripeHelpers(page)
    await stripe.fillCheckoutForm(successfulCard)

    await expect(page).toHaveURL(/\/settings\/billing\?session_id=/, { timeout: 30_000 })
    await expect(page.getByText(/Pro/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/trialing|active/i).first()).toBeVisible({ timeout: 30_000 })
  })
})
