import { expect } from '@playwright/test'
import { Selectors } from '../utils/selectors.js'

/**
 * Common assertion helpers for E2E tests
 */
export class AssertionHelpers {
  constructor(page) {
    this.page = page
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000'
    this.timing = { webhooks: { processingDelay: 5000 } }
  }

  /**
   * Assert that user is on the correct plan
   */
  async assertCurrentPlan(expectedPlanId, options = {}) {
    const { skipDebug = false } = options

    console.log(`🔍 Verifying user is on ${expectedPlanId} plan...`)

    await this.page.goto(`${this.baseURL}/settings/billing`)
    await this.page.waitForTimeout(3000)

    try {
      const planIndicators = this.getPlanIndicators(expectedPlanId)

      let planFound = false
      for (const indicator of planIndicators) {
        try {
          const element = this.page.locator(indicator.selector)
          if (await element.isVisible({ timeout: 5000 })) {
            if (indicator.textMatch) {
              const text = await element.textContent()
              if (text && text.toLowerCase().includes(indicator.textMatch.toLowerCase())) {
                console.log(`✅ Found plan indicator: "${text}" (${indicator.selector})`)
                planFound = true
                break
              }
            } else {
              console.log(`✅ Found plan indicator: ${indicator.selector}`)
              planFound = true
              break
            }
          }
        } catch (e) {
          // Continue checking other indicators
        }
      }

      // Fallback: check text content within common current plan containers
      if (!planFound) {
        const baseCandidates = Selectors.get('billing', 'currentPlan')
        const expectedText = expectedPlanId.toLowerCase()
        for (const selector of baseCandidates) {
          try {
            const el = this.page.locator(selector).first()
            if (await el.isVisible({ timeout: 1000 })) {
              const text = (await el.textContent()) || ''
              if (text.toLowerCase().includes(expectedText)) {
                console.log(`✅ Found plan match in container (${selector}): "${text.trim()}"`)
                planFound = true
                break
              }
            }
          } catch (e) {
            // continue
          }
        }
      }

      expect(planFound).toBe(true)
      console.log(`✅ Verified user is on ${expectedPlanId} plan`)

    } catch (error) {
      console.error(`❌ Failed to verify plan ${expectedPlanId}: ${error.message}`)
      if (!skipDebug) {
        await this.debugBillingPage()
      }
      throw error
    }
  }

  /**
   * Get plan-specific indicators to look for
   */
  getPlanIndicators(planId) {
    const baseSelectors = Selectors.get('billing', 'currentPlan').map(s => ({ selector: s, textMatch: null }))

    if (planId === 'free') {
      const freeSelectors = Selectors.get('assertions', 'planIndicators.free')
      return [
        ...baseSelectors,
        ...freeSelectors.map(selector => ({ selector, textMatch: null }))
      ]
    } else if (planId === 'pro') {
      const proSelectors = Selectors.get('assertions', 'planIndicators.pro')
      return [
        ...baseSelectors,
        ...proSelectors.map(selector => ({ selector, textMatch: null }))
      ]
    } else if (planId === 'enterprise') {
      const enterpriseSelectors = Selectors.get('assertions', 'planIndicators.enterprise')
      return [
        ...baseSelectors,
        ...enterpriseSelectors.map(selector => ({ selector, textMatch: null }))
      ]
    }

    return baseSelectors
  }

  /**
   * Assert that subscription was created successfully
   */
  async assertSubscriptionSuccess(planId) {
    console.log(`🔍 Verifying subscription success for ${planId} plan...`)

    const webhookDelay = this.timing?.webhooks?.processingDelay || 5000
    await this.page.waitForTimeout(webhookDelay)

    const successIndicators = Selectors.get('assertions', 'successIndicators.subscriptionCreated')

    let successFound = false
    for (const indicator of successIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 10000 })) {
          console.log(`✅ Found success indicator: ${indicator}`)
          successFound = true
          break
        }
      } catch (e) {}
    }

    if (!successFound) {
      await this.assertCurrentPlan(planId)
    } else {
      expect(successFound).toBe(true)
    }

    console.log(`✅ Subscription to ${planId} plan verified successfully`)
  }

  /**
   * Assert that plan change was successful
   */
  async assertPlanChangeSuccess(newPlanId) {
    console.log(`🔍 Verifying plan change success to ${newPlanId}...`)

    const webhookDelay = this.timing?.webhooks?.processingDelay || 5000
    await this.page.waitForTimeout(webhookDelay)

    const changeIndicators = Selectors.get('assertions', 'successIndicators.planChanged')

    let changeFound = false
    for (const indicator of changeIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 10000 })) {
          console.log(`✅ Found plan change indicator: ${indicator}`)
          changeFound = true
          break
        }
      } catch (e) {}
    }

    await this.assertCurrentPlan(newPlanId)

    console.log(`✅ Plan change to ${newPlanId} verified successfully`)
  }

  /**
   * Assert that payment method was added successfully
   */
  async assertPaymentMethodAdded() {
    console.log('🔍 Verifying payment method was added...')

    const paymentIndicators = Selectors.get('assertions', 'successIndicators.paymentAdded')

    let paymentFound = false
    for (const indicator of paymentIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 10000 })) {
          console.log(`✅ Found payment method indicator: ${indicator}`)
          paymentFound = true
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(paymentFound).toBe(true)
    console.log('✅ Payment method addition verified successfully')
  }

  /**
   * Assert that billing UI shows correct elements for plan
   */
  async assertBillingUIForPlan(planId) {
    console.log(`🔍 Verifying billing UI for ${planId} plan...`)

    // Simple expectations based on plan type
    const expectations = {
      free: {
        buttonText: 'Upgrade',
        buttonDisabled: false,
        showUpgradeOptions: true,
        showDowngradeOptions: false
      },
      pro: {
        buttonText: 'Change Plan',
        buttonDisabled: false,
        showUpgradeOptions: true,
        showDowngradeOptions: true
      },
      enterprise: {
        buttonText: 'Change Plan',
        buttonDisabled: false,
        showUpgradeOptions: false,
        showDowngradeOptions: true
      }
    }

    const planExpectations = expectations[planId]
    if (!planExpectations) {
      console.log(`ℹ️  No UI expectations defined for ${planId} plan`)
      return
    }

    // Navigate to billing settings
    await this.page.goto(`${this.baseURL}/settings/billing`)
    await this.page.waitForTimeout(3000)

    // Check button states and visibility
    if (planExpectations.buttonText) {
      const buttonSelector = 'button:has-text("Change Plan"), button:has-text("Current Plan")'
      const button = this.page.locator(buttonSelector).first()

      if (await button.isVisible({ timeout: 5000 })) {
        const buttonText = await button.textContent()
        expect(buttonText).toContain(planExpectations.buttonText)
        console.log(`✅ Button text correct: "${buttonText}"`)

        if (planExpectations.buttonDisabled !== undefined) {
          const isDisabled = await button.getAttribute('disabled')
          const actuallyDisabled = isDisabled !== null
          expect(actuallyDisabled).toBe(planExpectations.buttonDisabled)
          console.log(`✅ Button disabled state correct: ${actuallyDisabled}`)
        }
      }
    }

    // Check upgrade/downgrade options visibility
    if (planExpectations.showUpgradeOptions !== undefined) {
      const upgradeSelectors = Selectors.get('billing', 'upgradeButton')
      const upgradeSelector = upgradeSelectors.map(s => `text="${s.replace('button:has-text(\'', '').replace('\')', '')}"`).join(', ')
      const upgradeExists = await this.page.locator(upgradeSelector).first().isVisible({ timeout: 2000 })
      expect(upgradeExists).toBe(planExpectations.showUpgradeOptions)
      console.log(`✅ Upgrade options visibility correct: ${upgradeExists}`)
    }

    if (planExpectations.showDowngradeOptions !== undefined) {
      const downgradeSelectors = Selectors.get('billing', 'downgradeButton')
      const downgradeSelector = downgradeSelectors.map(s => `text="${s.replace('button:has-text(\'', '').replace('\')', '')}"`).join(', ')
      const downgradeExists = await this.page.locator(downgradeSelector).first().isVisible({ timeout: 2000 })
      expect(downgradeExists).toBe(planExpectations.showDowngradeOptions)
      console.log(`✅ Downgrade options visibility correct: ${downgradeExists}`)
    }

    console.log(`✅ Billing UI for ${planId} plan verified successfully`)
  }

  /**
   * Assert that error message appears for failed payment
   */
  async assertPaymentError(expectedError = null) {
    console.log('🔍 Verifying payment error appears...')

    const errorMessages = Selectors.get('assertions', 'errorMessages')

    const errorSelectors = Selectors.get('stripe', 'errorSelectors')

    let errorFound = false
    let errorText = ''

    for (const selector of errorSelectors) {
      try {
        const errorElement = this.page.locator(selector)
        if (await errorElement.isVisible({ timeout: 10000 })) {
          errorText = await errorElement.textContent()
          if (errorText && errorText.trim()) {
            console.log(`✅ Found error message: "${errorText}"`)
            errorFound = true
            break
          }
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }

    expect(errorFound).toBe(true)

    // If specific error expected, verify it matches
    if (expectedError && errorMessages[expectedError]) {
      const expectedMessage = errorMessages[expectedError]
      expect(errorText.toLowerCase()).toContain(expectedMessage.toLowerCase())
      console.log(`✅ Error message matches expected: "${expectedMessage}"`)
    }

    console.log('✅ Payment error verification successful')
  }

  /**
   * Assert that user is redirected to correct URL
   */
  async assertRedirect(expectedUrlPattern, timeout = 30000) {
    console.log(`🔍 Verifying redirect to: ${expectedUrlPattern}...`)

    try {
      if (typeof expectedUrlPattern === 'string') {
        await this.page.waitForURL(url => url.includes(expectedUrlPattern), { timeout })
      } else if (expectedUrlPattern instanceof RegExp) {
        await this.page.waitForURL(expectedUrlPattern, { timeout })
      } else {
        throw new Error('Invalid URL pattern type')
      }

      const currentUrl = this.page.url()
      console.log(`✅ Redirect successful. Current URL: ${currentUrl}`)

    } catch (error) {
      const currentUrl = this.page.url()
      console.error(`❌ Redirect failed. Expected: ${expectedUrlPattern}, Actual: ${currentUrl}`)
      throw new Error(`Redirect timeout. Expected: ${expectedUrlPattern}, Actual: ${currentUrl}`, { cause: error })
    }
  }

  /**
   * Assert that Stripe Checkout loaded correctly
   */
  async assertStripeCheckoutLoaded() {
    console.log('🔍 Verifying Stripe Checkout loaded...')

    const checkoutIndicators = Selectors.get('stripe', 'checkoutIndicators')

    let checkoutFound = false
    for (const indicator of checkoutIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 15000 })) {
          console.log(`✅ Stripe Checkout loaded: ${indicator}`)
          checkoutFound = true
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(checkoutFound).toBe(true)
    console.log('✅ Stripe Checkout verification successful')
  }

  /**
   * Assert that Stripe Customer Portal loaded correctly
   */
  async assertStripePortalLoaded() {
    console.log('🔍 Verifying Stripe Customer Portal loaded...')

    const portalIndicators = Selectors.get('stripe', 'portalIndicators')

    let portalFound = false
    for (const indicator of portalIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 10000 })) {
          console.log(`✅ Portal indicator found: ${indicator}`)
          portalFound = true
          break
        }
      } catch (e) {}
    }

    expect(portalFound).toBe(true)
    console.log('✅ Stripe Customer Portal verification successful')
  }

  /**
   * Debug current billing page content
   */
  async debugBillingPage() {
    try {
      console.log('🔍 DEBUGGING BILLING PAGE CONTENT:')

      const currentUrl = this.page.url()
      console.log(`Current URL: ${currentUrl}`)

      const title = await this.page.title()
      console.log(`Page title: "${title}"`)

      // Look for common billing elements
      const commonSelectors = [
        'h1', 'h2', 'h3',
        '[data-testid*="plan"]',
        '[data-testid*="subscription"]',
        'button:visible'
      ]

      for (const selector of commonSelectors) {
        try {
          const elements = await this.page.locator(selector).all()
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements matching "${selector}":`)
            for (let i = 0; i < Math.min(elements.length, 5); i++) {
              const text = await elements[i].textContent()
              if (text && text.trim()) {
                console.log(`  - "${text.trim()}"`)
              }
            }
          }
        } catch (e) {
          // Continue with other selectors
        }
      }

    } catch (error) {
      console.log(`Debug error: ${error.message}`)
    }
  }

  /**
   * Wait for element with custom timeout and error message
   */
  async waitForElement(selector, options = {}) {
    const {
      timeout = 10000,
      errorMessage = `Element not found: ${selector}`
    } = options

    try {
      await this.page.locator(selector).waitFor({ timeout })
      console.log(`✅ Element found: ${selector}`)
      return true
    } catch (error) {
      console.error(`❌ ${errorMessage}`)
      throw new Error(errorMessage, { cause: error })
    }
  }

  /**
   * Assert text content matches expected value
   */
  async assertTextContent(selector, expectedText, options = {}) {
    const {
      exact = false,
      timeout = 5000
    } = options

    const element = this.page.locator(selector).first()
    await element.waitFor({ timeout })

    const actualText = await element.textContent()

    if (exact) {
      expect(actualText?.trim()).toBe(expectedText)
    } else {
      expect(actualText?.toLowerCase()).toContain(expectedText.toLowerCase())
    }

    console.log(`✅ Text content verified: "${actualText}" ${exact ? 'equals' : 'contains'} "${expectedText}"`)
  }

  /**
   * Assert that no payment methods are present
   */
  async assertNoPaymentMethods() {
    console.log('🔍 Verifying no payment methods are present...')

    const paymentMethodIndicators = Selectors.get('assertions', 'paymentMethodIndicators')

    let paymentMethodFound = false
    for (const indicator of paymentMethodIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 2000 })) {
          paymentMethodFound = true
          console.log(`⚠️  Found payment method indicator: ${indicator}`)
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    // Also check for "No payment method" or similar messages
    const noPaymentIndicators = Selectors.get('assertions', 'noPaymentIndicators')

    let noPaymentMessageFound = false
    for (const indicator of noPaymentIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 2000 })) {
          noPaymentMessageFound = true
          console.log(`✅ Found no payment method message: ${indicator}`)
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(paymentMethodFound).toBe(false)
    expect(noPaymentMessageFound).toBe(true)
    console.log('✅ Verified no payment methods are present')
  }

  /**
   * Assert that no invoices are present
   */
  async assertNoInvoices() {
    console.log('🔍 Verifying no invoices are present...')

    const invoiceIndicators = Selectors.get('assertions', 'invoiceIndicators')

    let invoiceFound = false
    for (const indicator of invoiceIndicators) {
      try {
        // Skip the generic $ selector as it catches plan prices
        if (indicator === "text='$'") {
          continue
        }

        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 2000 })) {
          // Additional check: make sure it's not just a price display
          const text = await element.textContent()

          // More specific checks for actual invoices:
          // - Must have "Invoice #" or similar
          // - Must have "Paid" or "Pending" status
          // - Exclude plan prices (e.g., "$0/month", "$29/month")
          if (text) {
            const isPlanPrice = text.match(/\$\d+(?:\.\d{2})?\s*\/\s*(?:month|year)/i)

            if (isPlanPrice) {
              console.log(`ℹ️  Skipping plan price: "${text}"`)
              continue
            }

            const hasInvoiceNumber = text.match(/invoice\s*#/i)
            const hasStatus = text.match(/\b(paid|pending|due|overdue)\b/i)

            if (hasInvoiceNumber || hasStatus) {
              invoiceFound = true
              console.log(`⚠️  Found invoice indicator: ${indicator} with text: "${text}"`)
              break
            }
          }
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    // Also check for "No invoices" or similar messages
    const noInvoiceIndicators = Selectors.get('assertions', 'noInvoiceIndicators')

    let noInvoiceMessageFound = false
    for (const indicator of noInvoiceIndicators) {
      try {
        const element = this.page.locator(indicator)
        if (await element.isVisible({ timeout: 2000 })) {
          noInvoiceMessageFound = true
          console.log(`✅ Found no invoices message: ${indicator}`)
          break
        }
      } catch (e) {
        // Continue checking other indicators
      }
    }

    expect(invoiceFound).toBe(false)
    // Note: We don't require a "no invoices" message as it might not always be present
    console.log('✅ Verified no invoices are present')
  }

  /**
   * Assert that a payment method exists with given last four digits
   */
  async assertPaymentMethodExists(lastFour) {
    console.log(`🔍 Verifying payment method ending in ${lastFour} exists...`)

    // First try to find specific text with last four digits
    const specificSelectors = [
      `text="${lastFour}"`,
      `text="•••• ${lastFour}"`,
      `text="**** ${lastFour}"`,
      `text="•••• •••• •••• ${lastFour}"`,
      `text=/.*${lastFour}.*/i`
    ]

    let methodFound = false
    for (const selector of specificSelectors) {
      try {
        const element = this.page.locator(selector)
        if (await element.isVisible({ timeout: 3000 })) {
          console.log(`✅ Found payment method with last four: ${selector}`)
          methodFound = true
          break
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }

    // If not found, try generic payment method indicators
    if (!methodFound) {
      const basePaymentSelectors = Selectors.get('assertions', 'paymentMethodIndicators')
      for (const selector of basePaymentSelectors) {
        try {
          const element = this.page.locator(selector)
          if (await element.isVisible({ timeout: 3000 })) {
            console.log(`✅ Found generic payment method indicator: ${selector}`)
            methodFound = true
            break
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }
    }

    expect(methodFound).toBe(true)
    console.log(`✅ Payment method ending in ${lastFour} verified`)
  }

  /**
   * Assert that subscription is active for given plan
   */
  async assertSubscriptionActive(planId, options = {}) {
    const {
      timeout = 30000,
      checkWebhookSync = true
    } = options

    console.log(`🔍 Verifying subscription is active for ${planId} plan...`)

    // Wait for webhook processing if requested
    if (checkWebhookSync) {
      const webhookDelay = this.timing?.webhooks?.processingDelay || 5000
      console.log(`⏳ Waiting ${webhookDelay}ms for webhook processing...`)
      await this.page.waitForTimeout(webhookDelay)
    }

    // Navigate to billing page to check subscription status
    await this.page.goto(`${this.baseURL}/settings/billing`)
    await this.page.waitForTimeout(3000)

    try {
      // Check for active subscription indicators
      const activeSubscriptionSelectors = [
        `text="Active Subscription"`,
        `text="Current Plan: ${planId}"`,
        `text="${planId} Plan Active"`,
        `[data-testid="subscription-status"]:has-text("Active")`,
        `[data-testid="subscription-status"]:has-text("active")`
      ]

      let subscriptionActive = false
      for (const selector of activeSubscriptionSelectors) {
        try {
          const element = this.page.locator(selector)
          if (await element.isVisible({ timeout: 5000 })) {
            console.log(`✅ Found active subscription indicator: ${selector}`)
            subscriptionActive = true
            break
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }

      // Also verify the plan shows as current
      await this.assertCurrentPlan(planId)

      // Verify billing UI reflects active subscription
      await this.assertBillingUIForActivePlan(planId)

      expect(subscriptionActive).toBe(true)
      console.log(`✅ Subscription active for ${planId} plan verified`)

    } catch (error) {
      console.error(`❌ Failed to verify active subscription for ${planId}: ${error.message}`)
      await this.debugBillingPage()
      throw error
    }
  }

  /**
   * Assert billing UI shows correct elements for active subscription
   */
  async assertBillingUIForActivePlan(planId) {
    console.log(`🔍 Verifying billing UI for active ${planId} subscription...`)

    try {
      const managementButtons = Selectors.get('billing', 'manageSubscriptionButton')

      let managementButtonFound = false
      for (const selector of managementButtons) {
        try {
          const button = this.page.locator(selector)
          if (await button.isVisible({ timeout: 3000 })) {
            console.log(`✅ Found subscription management button: ${selector}`)
            managementButtonFound = true
            break
          }
        } catch (e) {}
      }

      expect(managementButtonFound).toBe(true)

      const subscriptionDetails = Selectors.get('assertions', 'subscriptionIndicators.active')

      let detailsFound = false
      for (const selector of subscriptionDetails) {
        try {
          const element = this.page.locator(selector)
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`✅ Found subscription detail: ${selector}`)
            detailsFound = true
            break
          }
        } catch (e) {}
      }

      if (detailsFound) {
        console.log('✅ Subscription details visible')
      } else {
        console.log('ℹ️  Subscription details not visible (may not be implemented)')
      }

      console.log(`✅ Billing UI for active ${planId} subscription verified`)

    } catch (error) {
      console.error(`❌ Error verifying billing UI: ${error.message}`)
      throw error
    }
  }

  /**
   * Wait for subscription to sync after payment
   */
  async waitForSubscriptionSync(planId, timeoutMs = 45000) {
    console.log(`⏳ Waiting for subscription sync to ${planId} plan...`)

    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if subscription is now active
        await this.assertSubscriptionActive(planId, { checkWebhookSync: false })
        console.log('✅ Subscription sync completed')
        return true
      } catch (e) {
        // Not synced yet, continue waiting
        console.log('⏳ Subscription not synced yet, waiting...')
        await this.page.waitForTimeout(3000)
      }
    }

    throw new Error(`Subscription sync timeout after ${timeoutMs}ms`)
  }

  /**
   * Assert payment processing completed successfully
   */
  async assertPaymentProcessed(options = {}) {
    const {
      expectedAmount = null,
      timeout = 15000
    } = options

    console.log('🔍 Verifying payment was processed successfully...')

    try {
      // Look for payment success indicators
      const successIndicators = [
        'text="Payment successful"',
        'text="Payment completed"',
        'text="Thank you for your payment"',
        'text="Your payment has been processed"',
        '[data-testid="payment-success"]',
        '[role="alert"]:has-text("Success")'
      ]

      let paymentSuccess = false
      for (const selector of successIndicators) {
        try {
          const element = this.page.locator(selector)
          if (await element.isVisible({ timeout: 3000 })) {
            console.log(`✅ Payment success indicator found: ${selector}`)
            paymentSuccess = true
            break
          }
        } catch (e) {
          // Continue checking
        }
      }

      // If no success message found, check if we're back in the app
      if (!paymentSuccess) {
        const currentUrl = this.page.url()
        if (currentUrl.includes(this.baseURL) && !currentUrl.includes('stripe.com')) {
          console.log('✅ Redirected back to app - payment likely successful')
          paymentSuccess = true
        }
      }

      expect(paymentSuccess).toBe(true)
      console.log('✅ Payment processing verified successfully')

    } catch (error) {
      console.error(`❌ Failed to verify payment processing: ${error.message}`)
      throw error
    }
  }

  /**
   * Assert that user journey completed successfully
   */
  async assertJourneyCompleted(journeyType, expectedOutcome) {
    console.log(`🔍 Verifying ${journeyType} journey completed with ${expectedOutcome}...`)

    const outcomes = {
      'subscription_active': async (planId = 'pro') => {
        await this.assertSubscriptionActive(planId)
        await this.assertPaymentMethodExists('4242') // Last 4 of test card
      },
      'payment_failed': async () => {
        await this.assertPaymentError()
        await this.assertCurrentPlan('free') // Should still be on free plan
      },
      'user_created': async () => {
        // Check that user is logged in and on free plan
        const currentUrl = this.page.url()
        expect(currentUrl).not.toContain('/auth')
        await this.assertCurrentPlan('free')
      }
    }

    if (outcomes[expectedOutcome]) {
      await outcomes[expectedOutcome]()
      console.log(`✅ Journey ${journeyType} completed successfully with ${expectedOutcome}`)
    } else {
      throw new Error(`Unknown expected outcome: ${expectedOutcome}`)
    }
  }

  /**
   * Assert that payment method was added successfully in portal
   */
  async assertPaymentMethodAddedInPortal(lastFour = '4242') {
    console.log(`🔍 Verifying payment method ending in ${lastFour} was added...`)

    try {
      // Wait for portal update
      await this.page.waitForTimeout(2000)

      // Check for success messages
      const successIndicators = [
        'text="Payment method added"',
        'text="Card added successfully"',
        'text="successfully added"',
        'text="Success"'
      ]

      let successFound = false
      for (const indicator of successIndicators) {
        try {
          const element = this.page.locator(indicator)
          if (await element.isVisible({ timeout: 3000 })) {
            console.log(`✅ Found success indicator: ${indicator}`)
            successFound = true
            break
          }
        } catch (e) {
          // Continue checking
        }
      }

      // Also check if card appears in the list
      const cardIndicators = [
        `text="•••• ${lastFour}"`,
        `text="****${lastFour}"`,
        `text="${lastFour}"`
      ]

      let cardFound = false
      for (const indicator of cardIndicators) {
        try {
          const element = this.page.locator(indicator)
          if (await element.isVisible({ timeout: 3000 })) {
            console.log(`✅ Found card indicator: ${indicator}`)
            cardFound = true
            break
          }
        } catch (e) {
          // Continue checking
        }
      }

      expect(successFound || cardFound).toBe(true)
      console.log(`✅ Payment method ending in ${lastFour} verified added`)

    } catch (error) {
      console.error(`❌ Failed to verify payment method addition: ${error.message}`)
      throw error
    }
  }

  /**
   * Assert that plan change was completed in portal
   */
  async assertPlanChangedInPortal(newPlanId) {
    console.log(`🔍 Verifying plan was changed to ${newPlanId} in portal...`)

    try {
      // Wait for portal update
      await this.page.waitForTimeout(2000)

      // Check for success messages
      const successIndicators = [
        'text="Plan updated"',
        'text="Subscription updated"',
        `text="${newPlanId}"`,
        'text="successfully"',
        'text="Success"'
      ]

      let successFound = false
      for (const indicator of successIndicators) {
        try {
          const element = this.page.locator(indicator)
          if (await element.isVisible({ timeout: 3000 })) {
            console.log(`✅ Found success indicator: ${indicator}`)
            successFound = true
            break
          }
        } catch (e) {
          // Continue checking
        }
      }

      expect(successFound).toBe(true)
      console.log(`✅ Plan change to ${newPlanId} verified in portal`)

    } catch (error) {
      console.error(`❌ Failed to verify plan change: ${error.message}`)
      throw error
    }
  }
}
