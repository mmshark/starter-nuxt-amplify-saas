<script setup lang="ts">
/**
 * FeatureGate Component
 *
 * Conditional rendering based on feature entitlements.
 * Shows content only if user's plan includes the required feature.
 */

import type { Feature } from '../types/entitlements'

interface Props {
  feature: Feature
  fallback?: boolean
}

const props = defineProps<Props>()

const slots = defineSlots<{
  default(): any
  fallback(): any
}>()

const { canAccessFeature } = useEntitlements()

const hasAccess = computed(() => canAccessFeature(props.feature))
</script>

<template>
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else-if="slots.fallback || fallback">
    <slot name="fallback" />
  </div>
</template>
