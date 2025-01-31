<template>
  <!-- Outer wrapper: apply special border if "preferred" -->
  <div
    class="flex-1 w-full flex flex-col rounded-xl overflow-hidden min-h-[28rem] max-w-[26rem]"
    :class="isPreferred ? 'border-4 border-primary-500' : ''"
  >
    <!-- Top section - style changes if plan is "preferred" -->
    <div
      :class="[
        isPreferred
          ? 'bg-surface-700 dark:bg-surface-50 text-surface-0 dark:text-surface-900'
          : 'bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-0'
      ] + ' text-center py-4 px-6'"
    >
      <!-- Show a badge only if plan is preferred -->
      <div
        v-if="isPreferred"
        class="uppercase rounded-full text-sm bg-primary-500 w-fit mx-auto px-3 py-1.5 text-surface-0 font-bold mb-4"
      >
        {{ plan.metadata?.preferred }}
      </div>

      <!-- Plan name -->
      <div class="text-2xl font-bold mb-4">
        {{ plan.name }}
      </div>

      <!-- Price display -->
      <div v-if="displayedPrice !== null" class="flex items-center justify-center gap-2">
        <span class="font-bold text-[2.5rem]">
          {{ displayedPrice }}
        </span>
        <span class="text-2xl text-surface-400">
          /{{ isYearly ? 'year' : 'month' }}
        </span>
      </div>
    </div>

    <!-- Bottom section -->
    <div
      :class="[
        isPreferred
          ? 'bg-surface-800 dark:bg-surface-200'
          : 'bg-surface-100 dark:bg-surface-800'
      ] + ' p-6 flex flex-col grow'"
    >
      <!-- Plan description (if any) -->
      <div
        class="font-bold leading-6 mb-6"
        :class="isPreferred ? 'text-surface-400 dark:text-surface-500' : 'text-surface-400'"
      >
        {{ plan.description || 'Subtitle of the plan maybe two lines.' }}
      </div>

      <div class="w-full h-px bg-surface-300 dark:bg-surface-700 mb-4" />

      <!-- Marketing Features list -->
      <ul class="list-none p-0 flex flex-col gap-4 flex-1">
        <li
          v-for="(feature, index) in plan.marketing_features"
          :key="index"
          class="flex items-center gap-2"
        >
          <i class="pi pi-check-circle text-green-500 text-lg" />
          <span :class="[
            'leading-6',
            isPreferred ? 'text-surface-200 dark:text-surface-700' : 'text-surface-800 dark:text-surface-100'
          ]">
            {{ feature.name }}
          </span>
        </li>
      </ul>

      <div class="w-full h-px bg-surface-300 dark:bg-surface-700 mt-4" />

      <!-- CTA / Button -->
      <Button
        v-if="displayedPrice === null"
        outlined
        severity="info"
        class="px-5 py-3 border !border-blue-500 !text-blue-400 hover:!bg-blue-500/10 font-bold mt-4"
        label="Contact Us"
      />
      <Button
        v-else-if="displayedPrice === 0"
        severity="secondary"
        class="px-5 py-3 !bg-surface-500 hover:!bg-surface-400 !text-surface-0 mt-4"
        label="Try Free"
      />
      <Button
        v-else
        class="px-5 py-3 mt-4"
        label="Buy Now"
      />
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import { computed } from 'vue';

const props = defineProps({
  plan: {
    type: Object,
    required: true,
  },
  isYearly: {
    type: Boolean,
    default: false,
  },
});

// Compute if plan is preferred based on metadata
const isPreferred = computed(() => !!props.plan.metadata?.preferred);

// Compute the price based on monthly vs. yearly toggle
const displayedPrice = computed(() => {
  const { monthlyPrice, yearlyPrice } = props.plan || {};
  if (!monthlyPrice || !yearlyPrice) return null;
  return props.isYearly ? yearlyPrice.amount : monthlyPrice.amount;
});

// Compute if the plan is free
const isFreePrice = computed(() => {
  const { monthlyPrice, yearlyPrice } = props.plan || {};
  if (!monthlyPrice || !yearlyPrice) return false;
  return monthlyPrice.amount === 0 && yearlyPrice.amount === 0;
});
</script>

<style scoped>
/* Add or adjust styling as needed */
</style>
