<script setup lang="ts">
useSeoMeta({
  title: 'Plans',
  description: 'Choose the plan that fits your workspace'
})

const billing = useBilling()
const { currentPlanId } = billing
const { isOwner } = useWorkspaceMembership()

// monthly/yearly toggle
const interval = ref<'monthly' | 'yearly'>('monthly')
const yearly = computed({
  get: () => interval.value === 'yearly',
  set: (v: boolean) => { interval.value = v ? 'yearly' : 'monthly' }
})

onMounted(async () => {
  await billing.ensureInitialized()
})
</script>

<template>
  <UPageCard
    title="Plans"
    description="Choose the plan that fits your workspace"
  >
    <div class="space-y-6">
      <div class="flex items-center justify-between gap-4">
        <UButton
          to="/settings/billing"
          variant="ghost"
          icon="i-lucide-arrow-left"
          size="sm"
        >
          Back to billing
        </UButton>
        <USwitch v-model="yearly" label="Yearly billing" />
      </div>

      <UAlert
        v-if="!isOwner"
        color="warning"
        variant="subtle"
        icon="i-lucide-lock"
        title="Owner only"
        description="Only the workspace owner can change the plan."
      />

      <PricingPlans
        :interval="interval"
        :selected-plan-id="currentPlanId"
        :disabled="!isOwner"
        cta-label="Choose plan"
      />
    </div>
  </UPageCard>
</template>
