<template>
  <div class="p-m-4">
    <!-- Your Subscription Card -->
    <Card title="Your Subscription" class="p-mb-4">
      <template #subtitle>
        <span v-if="activeSubscription">Here are your current subscription details.</span>
        <span v-else>You are not subscribed to any plan.</span>
      </template>

      <template #content>
        <!-- Loading indicator -->
        <div v-if="subscriptionLoading" class="p-my-2 flex justify-center">
          <ProgressSpinner style="width: 50px; height: 50px;" strokeWidth="6" />
        </div>
        <!-- Display subscription details if available -->
        <div v-else-if="activeSubscription" class="p-d-flex p-flex-column">
          <p><strong>Plan:</strong> {{ activeSubscription.name }}</p>
          <p><strong>Billing:</strong> {{ activeSubscription.billingPeriod || 'N/A' }}</p>
          <p><strong>Renewal:</strong> {{ activeSubscription.renewalDate || 'N/A' }}</p>
        </div>
        <!-- Prompt if no subscription -->
        <div v-else class="p-my-2">
          <p>You are not currently subscribed. Choose a plan below to get started.</p>
        </div>
      </template>

      <template #footer>
        <Button
          v-if="activeSubscription && !subscriptionLoading"
          label="Cancel Subscription"
          icon="pi pi-times"
          class="p-button-danger"
          @click="handleCancelSubscription"
        />
      </template>
    </Card>

    <!-- Available Plans Card -->
    <Card title="Available Plans">
      <template #subtitle>
        <span>Select a plan that fits your needs.</span>
      </template>

      <template #content>
        <!-- Loading indicator -->
        <div v-if="plansLoading" class="p-my-2 flex justify-center">
          <ProgressSpinner style="width: 50px; height: 50px;" strokeWidth="6" />
        </div>
        <!-- Error message -->
        <div v-else-if="plansError" class="p-error p-my-2">
          {{ plansError }}
        </div>
        <!-- Display plans -->
        <div v-else class="p-d-flex p-flex-column p-ai-start p-mb-3">
          <p class="p-mb-2">Choose a plan and click "Change Plan":</p>
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="p-field-radiobutton p-mb-2 subscription-plan-item"
          >
            <div class="p-d-flex p-ai-center">
              <RadioButton
                :inputId="plan.id"
                name="planGroup"
                :value="plan.id"
                v-model="selectedPlan"
              />
              <label :for="plan.id" class="p-ml-2">
                {{ plan.name || plan.id }}
                <Badge
                  v-if="plan.metadata?.preferred"
                  :value="plan.metadata.preferred"
                  class="p-ml-2"
                />
                <span class="p-ml-1">
                  (
                  <span v-if="getMonthlyPrice(plan)">
                    €{{ (getMonthlyPrice(plan).unit_amount / 100).toFixed(2) }}/mo
                  </span>
                  <span v-if="getMonthlyPrice(plan) && getYearlyPrice(plan)">
                    &nbsp;•&nbsp;
                  </span>
                  <span v-if="getYearlyPrice(plan)">
                    €{{ (getYearlyPrice(plan).unit_amount / 100).toFixed(2) }}/yr
                  </span>
                  )
                </span>
              </label>
            </div>
            <p v-if="plan.description" class="p-ml-4 p-my-1">
              {{ plan.description }}
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <Button
          label="Change Plan"
          icon="pi pi-check"
          class="p-button-success"
          :disabled="!activeSubscription || selectedPlan === activeSubscription.plan || subscriptionLoading"
          @click="handleChangePlan"
        />
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useSubscription } from '@/composables/useSubscription';
import { usePlans } from '@/composables/usePlans';

definePageMeta({ layout: 'app' });

// Subscription composable
const {
  activeSubscription,
  fetchActiveSubscription,
  cancelSubscription,
  changePlan
} = useSubscription();
const subscriptionLoading = ref(false);

// Plans composable
const { plans, isLoading: plansLoading, error: plansError, fetchPlans } = usePlans();

// Selected plan (by plan ID)
const selectedPlan = ref(null);

// Helper functions to extract prices
const getMonthlyPrice = (plan) =>
  plan.prices?.find((price) => price.recurring?.interval === 'month') || null;
const getYearlyPrice = (plan) =>
  plan.prices?.find((price) => price.recurring?.interval === 'year') || null;

// Fetch subscription and plans on mount
onMounted(async () => {
  try {
    subscriptionLoading.value = true;
    await fetchActiveSubscription();
    if (activeSubscription.value) {
      selectedPlan.value = activeSubscription.value.plan;
    }
    await fetchPlans({ sortByIndex: true });
  } catch (error) {
    console.error('Error loading subscription data:', error);
  } finally {
    subscriptionLoading.value = false;
  }
});

// Update selected plan when active subscription changes
watch(activeSubscription, (newVal) => {
  selectedPlan.value = newVal ? newVal.plan : null;
});

// Action handlers
const handleChangePlan = async () => {
  if (!selectedPlan.value) return;
  try {
    subscriptionLoading.value = true;
    const success = await changePlan(selectedPlan.value);
    if (success) {
      alert(`Your plan has been changed to: ${selectedPlan.value}`);
    } else {
      alert('Could not change plan. Please try again later.');
    }
  } catch (error) {
    console.error('Error changing plan:', error);
    alert('An error occurred while changing your plan.');
  } finally {
    subscriptionLoading.value = false;
  }
};

const handleCancelSubscription = async () => {
  if (!confirm('Are you sure you want to cancel your subscription?')) return;
  try {
    subscriptionLoading.value = true;
    const success = await cancelSubscription();
    if (success) {
      alert('Your subscription has been canceled.');
    } else {
      alert('Could not cancel subscription. Please try again later.');
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    alert('An error occurred while canceling your subscription.');
  } finally {
    subscriptionLoading.value = false;
  }
};
</script>

<style scoped>
.p-m-4 {
  margin: 1.5rem;
}
.p-mb-4 {
  margin-bottom: 1.5rem;
}
.p-mb-3 {
  margin-bottom: 1rem;
}
.p-mb-2 {
  margin-bottom: 0.5rem;
}
.p-my-2 {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.p-error {
  color: #f44336;
}
.plan-features {
  list-style: disc;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}
.subscription-plan-item {
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}
.flex {
  display: flex;
}
.justify-center {
  justify-content: center;
}
</style>