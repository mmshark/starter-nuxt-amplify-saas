import { z } from 'zod'

const idPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const localePattern = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-[0-9]{3})?$/
const supportedCurrencies = new Set(Intl.supportedValuesOf('currency'))

export const configIdSchema = z.string()
  .min(1)
  .max(64)
  .regex(idPattern, 'Must be a lowercase kebab-case identifier')

export const localeCodeSchema = z.string()
  .regex(localePattern, 'Must be a BCP 47 locale such as en, es or en-US')

export const currencyCodeSchema = z.string()
  .regex(/^[A-Z]{3}$/, 'Must be an uppercase ISO 4217 currency code')
  .refine(code => supportedCurrencies.has(code), 'Must be a supported ISO 4217 currency code')

const httpUrlSchema = z.url().refine((value) => {
  if (!URL.canParse(value)) {
    return false
  }

  const protocol = new URL(value).protocol
  return protocol === 'http:' || protocol === 'https:'
}, 'Must use the http or https protocol')

export const uiColorSchema = z.enum([
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink',
  'rose', 'slate', 'gray', 'zinc', 'neutral', 'stone',
])

const publicAssetSchema = z.union([
  httpUrlSchema,
  z.string().regex(/^\/(?!\/).+/, 'Must be an absolute public path or URL'),
])

export const productSchema = z.object({
  id: configIdSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(280),
  urls: z.object({
    app: httpUrlSchema,
    landing: httpUrlSchema,
    support: httpUrlSchema.optional(),
    privacy: httpUrlSchema.optional(),
    terms: httpUrlSchema.optional(),
  }).strict(),
}).strict()

export const brandSchema = z.object({
  logo: publicAssetSchema,
  favicon: publicAssetSchema,
  colors: z.object({
    primary: uiColorSchema,
    neutral: uiColorSchema,
  }).strict(),
}).strict()

export const localeSchema = z.object({
  code: localeCodeSchema,
  name: z.string().trim().min(1).max(80),
}).strict()

export const localizationSchema = z.object({
  defaultLocale: localeCodeSchema,
  locales: z.array(localeSchema).min(1),
  defaultCurrency: currencyCodeSchema,
}).strict()

const catalogPriceSchema = z.number().finite().nonnegative().multipleOf(0.01)
const planLimitSchema = z.union([
  z.number().finite().nonnegative(),
  z.boolean(),
  z.null(),
])

export const billingPlanSchema = z.object({
  id: configIdSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(280),
  currency: currencyCodeSchema,
  prices: z.object({
    monthly: catalogPriceSchema,
    yearly: catalogPriceSchema,
  }).strict(),
  trialDays: z.int().nonnegative().max(365).optional(),
  features: z.array(z.string().trim().min(1).max(160)).min(1),
  limits: z.record(configIdSchema, planLimitSchema).default({}),
}).strict()

export const billingSchema = z.object({
  plans: z.array(billingPlanSchema).min(1),
}).strict()

export const entitlementFeatureSchema = z.object({
  id: configIdSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(280).optional(),
}).strict()

export const entitlementsSchema = z.object({
  features: z.array(entitlementFeatureSchema).min(1),
  plans: z.record(configIdSchema, z.array(configIdSchema)),
}).strict()

export const authSchema = z.object({
  signupFields: z.array(z.enum([
    'email', 'givenName', 'familyName', 'displayName', 'profilePicture',
  ])).min(1),
  providers: z.array(z.enum([
    'google', 'github', 'facebook', 'apple', 'amazon',
  ])).default([]),
  mfa: z.enum(['off', 'optional', 'required']).default('off'),
}).strict()

export const shellSchema = z.object({
  multiWorkspace: z.boolean(),
  workspaceSwitcher: z.boolean(),
  darkMode: z.boolean(),
  onboarding: z.boolean(),
}).strict()

function addDuplicateIssues(
  values: readonly string[],
  path: PropertyKey[],
  label: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>()
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate ${label}: ${value}`,
        path: [...path, index],
      })
    }
    seen.add(value)
  })
}

export const saasConfigSchema = z.object({
  product: productSchema,
  brand: brandSchema,
  localization: localizationSchema,
  billing: billingSchema,
  entitlements: entitlementsSchema,
  auth: authSchema,
  shell: shellSchema,
}).strict().superRefine((config, context) => {
  const localeCodes = config.localization.locales.map(locale => locale.code)
  const planIds = config.billing.plans.map(plan => plan.id)
  const featureIds = config.entitlements.features.map(feature => feature.id)

  addDuplicateIssues(localeCodes, ['localization', 'locales'], 'locale code', context)
  addDuplicateIssues(planIds, ['billing', 'plans'], 'plan id', context)
  addDuplicateIssues(featureIds, ['entitlements', 'features'], 'feature id', context)
  addDuplicateIssues(config.auth.signupFields, ['auth', 'signupFields'], 'signup field', context)
  addDuplicateIssues(config.auth.providers, ['auth', 'providers'], 'auth provider', context)

  if (!localeCodes.includes(config.localization.defaultLocale)) {
    context.addIssue({
      code: 'custom',
      message: 'Default locale must be present in localization.locales',
      path: ['localization', 'defaultLocale'],
    })
  }

  if (!config.auth.signupFields.includes('email')) {
    context.addIssue({
      code: 'custom',
      message: 'Email must be included because the starter authenticates by email',
      path: ['auth', 'signupFields'],
    })
  }

  const planIdSet = new Set(planIds)
  const featureIdSet = new Set(featureIds)

  config.billing.plans.forEach((plan, planIndex) => {
    addDuplicateIssues(plan.features, ['billing', 'plans', planIndex, 'features'], 'plan feature', context)
    if (plan.currency !== config.localization.defaultCurrency) {
      context.addIssue({
        code: 'custom',
        message: 'Plan currency must match localization.defaultCurrency',
        path: ['billing', 'plans', planIndex, 'currency'],
      })
    }
  })

  for (const planId of Object.keys(config.entitlements.plans)) {
    if (!planIdSet.has(planId)) {
      context.addIssue({
        code: 'custom',
        message: `Entitlements reference unknown plan: ${planId}`,
        path: ['entitlements', 'plans', planId],
      })
    }
  }

  for (const planId of planIds) {
    if (!(planId in config.entitlements.plans)) {
      context.addIssue({
        code: 'custom',
        message: `Missing entitlements mapping for plan: ${planId}`,
        path: ['entitlements', 'plans', planId],
      })
      continue
    }

    const entitlements = config.entitlements.plans[planId] ?? []
    addDuplicateIssues(entitlements, ['entitlements', 'plans', planId], 'entitlement feature', context)
    entitlements.forEach((featureId, featureIndex) => {
      if (!featureIdSet.has(featureId)) {
        context.addIssue({
          code: 'custom',
          message: `Plan ${planId} references unknown feature: ${featureId}`,
          path: ['entitlements', 'plans', planId, featureIndex],
        })
      }
    })
  }
})

export function defineSaasConfig(input: unknown) {
  return saasConfigSchema.parse(input)
}
