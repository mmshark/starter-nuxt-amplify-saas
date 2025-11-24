import { describe, expect, it } from 'vitest'
import { FEATURES, PLAN_FEATURES } from '../../config/features'

describe('Features Configuration', () => {
  it('should have valid feature definitions', () => {
    for (const [id, def] of Object.entries(FEATURES)) {
      expect(def.id).toBe(id)
      expect(def.name).toBeDefined()
      expect(def.requiredPlan).toBeDefined()
      expect(def.enabled).toBeDefined()
    }
  })

  it('should have valid plan mappings', () => {
    for (const [plan, features] of Object.entries(PLAN_FEATURES)) {
      expect(Array.isArray(features)).toBe(true)
      // Verify all features exist in FEATURES
      features.forEach(f => {
        expect(FEATURES[f]).toBeDefined()
      })
    }
  })

  it('should enforce plan hierarchy', () => {
    // Pro should have all free features
    const freeFeatures = PLAN_FEATURES.free
    const proFeatures = PLAN_FEATURES.pro

    freeFeatures.forEach(f => {
      expect(proFeatures).toContain(f)
    })

    // Enterprise should have all pro features
    const enterpriseFeatures = PLAN_FEATURES.enterprise

    proFeatures.forEach(f => {
      expect(enterpriseFeatures).toContain(f)
    })
  })
})
