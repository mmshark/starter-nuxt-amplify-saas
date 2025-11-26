<script setup lang="ts">
/**
 * UpgradePrompt Component
 *
 * Display upgrade prompt when feature requires higher plan.
 * Provides clear messaging and CTA to upgrade.
 */

import type { Feature, Plan } from '../types/entitlements'

interface Props {
  feature?: Feature
  requiredPlan: Plan
  title?: string
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Upgrade Required',
  description: 'This feature requires a higher subscription plan.',
})

const { subscriptionPlan, getRequiredPlanForFeature } = useEntitlements()

const planName = computed(() => {
  return props.requiredPlan.charAt(0).toUpperCase() + props.requiredPlan.slice(1)
})

const currentPlanName = computed(() => {
  return subscriptionPlan.value.charAt(0).toUpperCase() + subscriptionPlan.value.slice(1)
})

const upgradeUrl = computed(() => {
  return `/billing?plan=${props.requiredPlan}`
})

const navigateToUpgrade = () => {
  navigateTo(upgradeUrl.value)
}
</script>

<template>
  <UCard>
    <div class="flex flex-col items-center justify-center space-y-4 py-8 text-center">
      <UIcon name="i-heroicons-lock-closed" class="h-12 w-12 text-gray-400" />

      <div class="space-y-2">
        <h3 class="text-lg font-semibold">
          {{ title }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ description }}
        </p>
      </div>

      <div class="flex items-center space-x-2 text-sm">
        <UBadge color="gray" variant="subtle">
          Current: {{ currentPlanName }}
        </UBadge>
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4 text-gray-400" />
        <UBadge color="primary" variant="subtle">
          Required: {{ planName }}
        </UBadge>
      </div>

      <UButton
        color="primary"
        size="lg"
        @click="navigateToUpgrade"
      >
        Upgrade to {{ planName }}
      </UButton>
    </div>
  </UCard>
</template>
