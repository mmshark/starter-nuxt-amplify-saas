<template>
  <div>
    <stripe-pricing-table 
      :pricing-table-id="pricingTableId"
      :publishable-key="publishableKey">
    </stripe-pricing-table>
  </div>
</template>

<script setup>
const props = defineProps({
  pricingTableId: {
    type: String,
    required: true
  },
  publishableKey: {
    type: String, 
    required: true
  }
})

onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://js.stripe.com/v3/pricing-table.js'
  script.async = true
  document.head.appendChild(script)
})
</script>
