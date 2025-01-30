<template>
  <div class="bg-surface-0 dark:bg-surface-950 px-6 py-20 md:px-12 lg:px-20">
    <!-- Headline / Titles -->
    <div class="text-primary-600 dark:text-primary-400 text-2xl mb-6 text-center">
      Save up to 25% today
    </div>
    <div class="text-surface-900 dark:text-surface-0 font-bold text-6xl text-center mb-6">
      Pricing Plans
    </div>

    <!-- Price Switcher (the snippet you provided) -->
    <div class="flex items-center justify-center mb-12">
      <ul
        class="rounded-full bg-surface-0 dark:bg-surface-800 p-1.5 m-0 list-none flex column-gap-2 overflow-x-auto select-none shadow border border-surface"
      >
        <li
          :class="[
            'px-4 py-2 rounded-full cursor-pointer font-medium flex items-center transition-color duration-150',
            { 'bg-primary-500 text-surface-0': selectedInterval === 'month' },
            {
              'bg-transparent text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700':
                selectedInterval !== 'month'
            }
          ]"
          @click="selectedInterval = 'month'"
        >
          Monthly
        </li>
        <li
          :class="[
            'px-4 py-2 rounded-full cursor-pointer font-medium flex items-center transition-color duration-150',
            { 'bg-primary-500 text-surface-0': selectedInterval === 'year' },
            {
              'bg-transparent text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700':
                selectedInterval !== 'year'
            }
          ]"
          @click="selectedInterval = 'year'"
        >
          Yearly
        </li>
      </ul>
    </div>

    <!-- Plan Cards -->
    <div class="flex flex-col lg:flex-row justify-center gap-8 lg:gap-4 xl:gap-12 mx-auto w-fit">
      <PlanVanilaCard
        v-for="plan in sortedPlans"
        :key="plan.id"
        :plan="plan"
        :is-yearly="isYearly"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import PlanVanilaCard from './card.vue';

// Props: array of plan objects
const props = defineProps({
  plans: {
    type: Array,
    required: true
  }
});

// Sort plans by metadata.index if available
const sortedPlans = computed(() => {
  return [...props.plans].sort((a, b) => {
    const indexA = a.metadata?.index ? parseInt(a.metadata.index) : Number.MAX_SAFE_INTEGER;
    const indexB = b.metadata?.index ? parseInt(b.metadata.index) : Number.MAX_SAFE_INTEGER;
    return indexA - indexB;
  });
});

// Tab state: 'month' or 'year'
const selectedInterval = ref('month');

// Convert the selected interval into a boolean
const isYearly = computed(() => selectedInterval.value === 'year');
</script>

<style scoped>
/* Adjust styles as needed */
</style>
