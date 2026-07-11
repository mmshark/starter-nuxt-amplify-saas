import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import saasConfig from '../../saas.config'
import { defineSaasConfig } from '../schema'

// Invalid-input tests deliberately mutate across the inferred contract boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutableConfig = Record<string, any>

function cloneConfig(): MutableConfig {
  return structuredClone(saasConfig) as MutableConfig
}

function expectIssueAt(run: () => unknown, path: PropertyKey[]) {
  try {
    run()
    throw new Error('Expected validation to fail')
  } catch (error) {
    expect(error).toBeInstanceOf(ZodError)
    const issues = (error as ZodError).issues
    expect(issues.some(issue => JSON.stringify(issue.path) === JSON.stringify(path))).toBe(true)
  }
}

describe('defineSaasConfig', () => {
  it('parses the canonical manifest', () => {
    const parsed = defineSaasConfig(saasConfig)
    expect(parsed.product.id).toBe('starter-saas')
    expect(parsed.billing.plans).toHaveLength(4)
  })

  it('rejects an unknown default locale with an actionable path', () => {
    const config = cloneConfig()
    config.localization.defaultLocale = 'fr'
    expectIssueAt(() => defineSaasConfig(config), ['localization', 'defaultLocale'])
  })

  it('rejects duplicate locale, plan and feature ids', () => {
    const localeConfig = cloneConfig()
    localeConfig.localization.locales.push({ code: 'en', name: 'Duplicate' })
    expectIssueAt(() => defineSaasConfig(localeConfig), ['localization', 'locales', 2])

    const planConfig = cloneConfig()
    planConfig.billing.plans[1].id = 'free'
    expectIssueAt(() => defineSaasConfig(planConfig), ['billing', 'plans', 1])

    const featureConfig = cloneConfig()
    featureConfig.entitlements.features[1].id = 'basic-dashboard'
    expectIssueAt(() => defineSaasConfig(featureConfig), ['entitlements', 'features', 1])
  })

  it('rejects invalid urls, ids and Nuxt UI colors', () => {
    const urlConfig = cloneConfig()
    urlConfig.product.urls.app = 'not-a-url'
    expectIssueAt(() => defineSaasConfig(urlConfig), ['product', 'urls', 'app'])

    const protocolConfig = cloneConfig()
    protocolConfig.product.urls.app = 'ftp://starter.example.com'
    expectIssueAt(() => defineSaasConfig(protocolConfig), ['product', 'urls', 'app'])

    const idConfig = cloneConfig()
    idConfig.product.id = 'Not Valid'
    expectIssueAt(() => defineSaasConfig(idConfig), ['product', 'id'])

    const colorConfig = cloneConfig()
    colorConfig.brand.colors.primary = 'ultraviolet'
    expectIssueAt(() => defineSaasConfig(colorConfig), ['brand', 'colors', 'primary'])
  })

  it('rejects negative, fractional-cent and excessive trial values', () => {
    const negativePrice = cloneConfig()
    negativePrice.billing.plans[1].prices.monthly = -1
    expectIssueAt(() => defineSaasConfig(negativePrice), ['billing', 'plans', 1, 'prices', 'monthly'])

    const fractionalCent = cloneConfig()
    fractionalCent.billing.plans[1].prices.monthly = 5.951
    expectIssueAt(() => defineSaasConfig(fractionalCent), ['billing', 'plans', 1, 'prices', 'monthly'])

    const trial = cloneConfig()
    trial.billing.plans[2].trialDays = 366
    expectIssueAt(() => defineSaasConfig(trial), ['billing', 'plans', 2, 'trialDays'])
  })

  it('rejects a plan currency that differs from the configured default', () => {
    const config = cloneConfig()
    config.billing.plans[0].currency = 'EUR'
    expectIssueAt(() => defineSaasConfig(config), ['billing', 'plans', 0, 'currency'])
  })

  it('rejects a currency-shaped code that is not ISO 4217', () => {
    const config = cloneConfig()
    config.localization.defaultCurrency = 'AAA'
    expectIssueAt(() => defineSaasConfig(config), ['localization', 'defaultCurrency'])
  })

  it('requires email signup for the email-auth starter', () => {
    const config = cloneConfig()
    config.auth.signupFields = ['displayName']
    expectIssueAt(() => defineSaasConfig(config), ['auth', 'signupFields'])
  })

  it('rejects duplicate signup fields and auth providers', () => {
    const signup = cloneConfig()
    signup.auth.signupFields.push('email')
    expectIssueAt(() => defineSaasConfig(signup), ['auth', 'signupFields', 1])

    const provider = cloneConfig()
    provider.auth.providers = ['google', 'google']
    expectIssueAt(() => defineSaasConfig(provider), ['auth', 'providers', 1])
  })

  it('rejects unknown and missing entitlement plan mappings', () => {
    const unknown = cloneConfig()
    unknown.entitlements.plans.ghost = []
    expectIssueAt(() => defineSaasConfig(unknown), ['entitlements', 'plans', 'ghost'])

    const missing = cloneConfig()
    delete missing.entitlements.plans.pro
    expectIssueAt(() => defineSaasConfig(missing), ['entitlements', 'plans', 'pro'])
  })

  it('rejects unknown and duplicate entitlement feature references', () => {
    const unknown = cloneConfig()
    unknown.entitlements.plans.free.push('not-a-feature')
    expectIssueAt(() => defineSaasConfig(unknown), ['entitlements', 'plans', 'free', 1])

    const duplicate = cloneConfig()
    duplicate.entitlements.plans.free.push('basic-dashboard')
    expectIssueAt(() => defineSaasConfig(duplicate), ['entitlements', 'plans', 'free', 1])
  })

  it('rejects duplicate marketing feature labels', () => {
    const config = cloneConfig()
    config.billing.plans[0].features.push('1 project')
    expectIssueAt(() => defineSaasConfig(config), ['billing', 'plans', 0, 'features', 4])
  })

  it('rejects secret-like and other unknown keys', () => {
    const config = cloneConfig()
    config.stripeSecretKey = 'sk_test_should_not_be_here'
    expectIssueAt(() => defineSaasConfig(config), [])
  })
})
