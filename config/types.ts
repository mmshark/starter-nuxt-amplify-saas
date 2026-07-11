import type { z } from 'zod'
import type {
  authSchema,
  billingPlanSchema,
  billingSchema,
  brandSchema,
  entitlementFeatureSchema,
  entitlementsSchema,
  localizationSchema,
  productSchema,
  saasConfigSchema,
  shellSchema,
} from './schema'

export type SaasConfig = z.infer<typeof saasConfigSchema>
export type ProductConfig = z.infer<typeof productSchema>
export type BrandConfig = z.infer<typeof brandSchema>
export type LocalizationConfig = z.infer<typeof localizationSchema>
export type BillingConfig = z.infer<typeof billingSchema>
export type BillingPlanConfig = z.infer<typeof billingPlanSchema>
export type EntitlementsConfig = z.infer<typeof entitlementsSchema>
export type EntitlementFeatureConfig = z.infer<typeof entitlementFeatureSchema>
export type AuthConfig = z.infer<typeof authSchema>
export type ShellConfig = z.infer<typeof shellSchema>
