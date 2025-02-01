<template>
  <div class="p-6">
    <Card class="max-w-3xl">
      <template #title>
        <h2 class="text-lg font-medium text-surface-900 dark:text-surface-0">
          Your Current Plan
        </h2>
      </template>
      <template #content>
        <div v-if="activeSubscription">
          <PlanVanilaActive :planName="planName" :subscription="activeSubscription" />
          <div class="flex gap-2 mt-6">
            <Button 
              v-if="!activeSubscription.cancel_at_period_end"
              severity="danger" 
              label="Cancel Subscription" 
              @click="handleCancel"
            />
          </div>
        </div>
        <div v-else class="text-surface-600">
          No active subscription found
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'app' });

const { activeSubscription, fetchActiveSubscription, cancelSubscription } = useSubscription();
const { plans, isLoading, fetchPlans } = usePlans();

const planName = computed(() => {
  if (!activeSubscription.value?.items?.data?.[0]?.price?.product) return '';
  const plan = plans.value.find(p => p.id === activeSubscription.value.items.data[0].price.product);
  return plan?.name || '';
});

onMounted(async () => {
  await Promise.all([
    fetchActiveSubscription(),
    fetchPlans()
  ]);
});

const handleCancel = async () => {
  const success = await cancelSubscription();
  if (success) {
    await fetchActiveSubscription();
  }
};
</script>