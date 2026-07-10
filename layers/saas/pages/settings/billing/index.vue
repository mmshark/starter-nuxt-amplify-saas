<script setup lang="ts">
useSeoMeta({
  title: 'Billing Settings',
  description: 'Manage your subscription and billing information'
})

const billing = useBilling()
const { isFreePlan } = billing
const { isOwner } = useWorkspaceMembership()

onMounted(async () => {
  await billing.ensureInitialized()
})
</script>

<template>
  <UPageCard
    title="Billing"
    description="Manage your subscription and billing information"
  >
    <div class="space-y-6">
      <CurrentSubscription>
        <!-- Free workspace: the Customer Portal cannot start a first
             subscription, so route to the in-app plans page instead. Gated to
             the workspace owner (server also enforces manage-billing). -->
        <template #actions="{ loading, openPortal }">
          <UButton
            v-if="isFreePlan"
            :to="isOwner ? '/settings/billing/plans' : undefined"
            :disabled="!isOwner"
            :title="isOwner ? undefined : 'Only the workspace owner can upgrade'"
            icon="i-lucide-arrow-up-circle"
          >
            Upgrade
          </UButton>
          <UButton
            v-else
            variant="outline"
            :loading="loading"
            @click="openPortal"
          >
            Change Plan
          </UButton>
        </template>
      </CurrentSubscription>
      <PaymentMethod />
      <InvoicesList />
    </div>
  </UPageCard>
</template>
