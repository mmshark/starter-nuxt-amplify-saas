import type { Feature, FeatureDefinition } from '../types/entitlements'

export const defineFeatures = (features: Record<Feature, Omit<FeatureDefinition, 'id'>>): Record<Feature, FeatureDefinition> => {
  const result = {} as Record<Feature, FeatureDefinition>

  for (const [key, value] of Object.entries(features)) {
    const id = key as Feature
    result[id] = {
      id,
      ...value
    }
  }

  return result
}
