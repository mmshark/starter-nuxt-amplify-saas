<script setup lang="ts">
import type { Feature } from '../types/entitlements'
import { useEntitlements } from '../composables/useEntitlements'

const props = defineProps<{
  feature: Feature
  fallback?: boolean
}>()

const { canAccessFeature } = useEntitlements()

const hasAccess = computed(() => canAccessFeature(props.feature))
</script>

<template>
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else-if="fallback || $slots.fallback">
    <slot name="fallback" />
  </div>
</template>
