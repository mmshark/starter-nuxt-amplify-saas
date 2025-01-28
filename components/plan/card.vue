<template>
  <div class="border border-slate-200 rounded-lg p-8 max-w-[320px] text-center transition-transform hover:-translate-y-1 hover:shadow-lg">
    <h3 class="text-2xl font-semibold mb-2">{{ plan.name }}</h3>
    <p class="text-slate-500 mb-6">{{ plan.description }}</p>
    
    <div class="mb-6">
      <div v-if="showPrice === 'month' || showPrice === 'all'" class="my-2">
        <span class="text-4xl font-bold">${{ plan.monthly_price }}</span>
        <span class="text-slate-500">/month</span>
      </div>
      <div v-if="showPrice === 'year' || showPrice === 'all'" class="my-2">
        <span class="text-4xl font-bold">${{ plan.yearly_price }}</span>
        <span class="text-slate-500">/year</span>
      </div>
    </div>

    <ul class="list-none p-0 m-0 mb-6">
      <li v-for="feature in plan.features" :key="feature" class="py-2 text-slate-600">
        {{ feature }}
      </li>
    </ul>

    <button class="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg cursor-pointer transition-colors">
      Select {{ plan.name }}
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  plan: {
    type: Object,
    required: true,
    validator: (plan) => {
      return plan.name && 
             plan.description &&
             plan.monthly_price &&
             plan.yearly_price &&
             Array.isArray(plan.features)
    }
  },
  showPrice: {
    type: String,
    required: false,
    default: 'all',
    validator: (value) => ['month', 'year', 'all'].includes(value)
  }
})
</script>
