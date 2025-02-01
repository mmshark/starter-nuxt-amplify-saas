<template>
  <div>
    <div class="flex items-center gap-2">
      <h3 class="text-base font-medium">{{ planName }}</h3>
      <Badge :value="subscription.status" severity="success" />
    </div>

    <div class="flex flex-col gap-4 mt-4">
      <div class="flex flex-col gap-2">
        <div>
          <p class="text-sm text-surface-600">Billing Period</p>
          <p class="font-medium">
            {{ subscription.plan.interval_count }} {{ subscription.plan.interval }}
            (next billing {{ new Date(subscription.current_period_end * 1000).toLocaleDateString() }})
          </p>
        </div>
        <div>
          <p class="text-sm text-surface-600">Amount</p>
          <p class="font-medium">
            {{ (subscription.plan.amount / 100).toFixed(2) }} {{ subscription.plan.currency.toUpperCase() }}
          </p>
        </div>
      </div>

      <div v-if="subscription.cancel_at_period_end" class="mt-2">
        <Message severity="warn">
          Your subscription will be canceled at the end of the current period
        </Message>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  planName: {
    type: String,
    required: true
  },
  subscription: {
    type: Object,
    required: true
  }
});
</script>
