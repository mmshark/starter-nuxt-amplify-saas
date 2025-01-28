<template>
  <div>
    <div v-if="priceSwitcher" class="flex justify-center mb-8">
      <div class="flex items-center gap-4">
        <span :class="{ 'font-bold': !isYearly }">Monthly</span>
        <button 
          @click="isYearly = !isYearly"
          class="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300"
        >
          <span 
            class="inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out"
            :class="isYearly ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
        <span :class="{ 'font-bold': isYearly }">Yearly</span>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
      <PlanCard 
        v-for="plan in plans" 
        :key="plan.id" 
        :plan="plan"
        :show-price="priceSwitcher ? (isYearly ? 'year' : 'month') : 'all'"
      />
    </div>
  </div>
</template>

<script setup>
import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import { ref, onMounted } from 'vue';

Amplify.configure(outputs);
const client = generateClient();
const plans = ref([]);
const isYearly = ref(false);

defineProps({
  priceSwitcher: {
    type: Boolean,
    default: false
  }
});

const fetchPlans = async () => {
  try {
    const plansData = await client.models.Plan.list();
    plans.value = plansData.data.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Error fetching plans:', error);
  }
};

onMounted(() => {
  fetchPlans();
});
</script>