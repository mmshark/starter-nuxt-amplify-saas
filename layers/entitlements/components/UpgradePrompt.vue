<script setup lang="ts">
import type { Feature, Plan } from '../types/entitlements'
import { useEntitlements } from '../composables/useEntitlements'

const props = defineProps<{
  feature?: Feature
  requiredPlan: Plan
  title?: string
  description?: string
}>()

const { getRequiredPlan } = useEntitlements()

const effectiveRequiredPlan = computed(() => {
  if (props.requiredPlan) return props.requiredPlan
  if (props.feature) return getRequiredPlan(props.feature)
  return 'pro'
})

const defaultTitle = computed(() => {
  const planName = effectiveRequiredPlan.value.charAt(0).toUpperCase() + effectiveRequiredPlan.value.slice(1)
  return `Upgrade to ${planName}`
})

const defaultDescription = computed(() => {
  return `This feature requires the ${effectiveRequiredPlan.value} plan.`
})

const handleUpgrade = () => {
  navigateTo(`/settings/billing?plan=${effectiveRequiredPlan.value}`)
}
</script>

<template>
  <UCard class="text-center">
    <div class="flex flex-col items-center gap-4 py-8">
      <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 text-gray-400" />

      <div class="space-y-1">
        <h3 class="text-lg font-semibold">
          {{ title || defaultTitle }}
        </h3>
        <p class="text-gray-500 dark:text-gray-400">
          {{ description || defaultDescription }}
        </p>
      </div>

      <UButton
        color="primary"
        size="lg"
        @click="handleUpgrade"
      >
        Upgrade Now
      </UButton>
    </div>
  </UCard>
</template>
