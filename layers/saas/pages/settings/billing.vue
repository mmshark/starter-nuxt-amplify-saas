<script setup lang="ts">
useSeoMeta({
  title: 'Billing Settings',
  description: 'Manage your subscription and billing information'
})

// Initialize billing data once when page mounts
const billing = useBilling()

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
      <CurrentSubscription />
      <PaymentMethod />
      <InvoicesList />
    </div>
  </UPageCard>
</template>
