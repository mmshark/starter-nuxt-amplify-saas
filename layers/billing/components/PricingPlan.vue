<template>
  <UPricingPlan v-bind="effectiveProps" />
</template>

<script setup lang="ts">
interface Plan {
  id: string
  name: string
  description?: string
  price: number
  interval: 'monthly' | 'yearly'
  currency?: string
  features?: string[]
  badge?: string
  stripePriceId?: string
  stripeMonthlyPriceId?: string
  stripeYearlyPriceId?: string
}

interface Props {
  // All UPricingPlan props - pass-through support
  title?: string
  description?: string
  price?: string
  billingCycle?: string
  features?: string[]
  badge?: string
  highlight?: boolean
  button?: any
  // Custom props for autonomous mode
  planId?: string | null
  interval?: 'monthly' | 'yearly'
  ctaLabel?: string
  selectedPlanId?: string
  controlled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  interval: 'monthly',
  ctaLabel: 'Choose Plan',
  controlled: false
})

const emit = defineEmits<{
  select: [plan: Plan]
  checkout: [payload: { priceId: string, planId: string, billingInterval: 'monthly' | 'yearly' }]
}>()

// Composable
const billing = useBilling()

// Check if component is in pass-through mode (any UPricingPlan prop provided)
const isPassThroughMode = computed(() => {
  return !!(props.title || props.price || props.features)
})

// Autonomous mode: fetch and display plan
const autonomousPlan = ref<Plan | null>(null)
const inFlight = ref(false)

const fetchPublicPlans = async () => {
  try {
    const resp = await $fetch('/api/billing/plans') as any
    const plans = resp?.data?.plans || []

    // Find specific plan if planId provided, otherwise use first plan
    const plan = props.planId
      ? plans.find((p: any) => p.id === props.planId)
      : plans[0]

    if (plan) {
      autonomousPlan.value = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: props.interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
        interval: props.interval,
        currency: plan.currency,
        features: [],
        stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
        stripeYearlyPriceId: plan.stripeYearlyPriceId
      }
    }
  } catch (e) {
    console.error('Failed to load billing plan', e)
    autonomousPlan.value = null
  }
}

// Initialize autonomous data when not in pass-through mode
onMounted(() => {
  if (!isPassThroughMode.value) {
    void fetchPublicPlans()
  }
})

// Helpers for autonomous mode
const getPriceId = (plan: Plan): string | null => {
  if (plan.stripePriceId) return plan.stripePriceId
  if (props.interval === 'yearly') return plan.stripeYearlyPriceId || null
  return plan.stripeMonthlyPriceId || null
}

const handleSelect = async () => {
  if (!autonomousPlan.value) return

  const plan = autonomousPlan.value

  if (props.controlled) {
    emit('select', plan)
    const priceId = getPriceId(plan)
    if (priceId) emit('checkout', { priceId, planId: plan.id, billingInterval: props.interval })
    return
  }

  const priceId = getPriceId(plan)
  if (!priceId) return

  try {
    inFlight.value = true
    const result = await billing.createCheckoutSession({
      priceId,
      planId: plan.id,
      billingInterval: props.interval
    })
    if (result?.success && result?.data?.url) {
      if (import.meta.client) {
        window.location.href = result.data.url
      } else {
        await navigateTo(result.data.url, { external: true })
      }
    } else {
      useToast().add({
        title: 'Checkout error',
        description: (result as { error?: string })?.error || 'No checkout URL returned',
        color: 'error'
      })
    }
  } finally {
    inFlight.value = false
  }
}

// Build effective props for UPricingPlan
const effectiveProps = computed(() => {
  // Pass-through mode: use provided props directly
  if (isPassThroughMode.value) {
    return {
      title: props.title,
      description: props.description,
      price: props.price,
      billingCycle: props.billingCycle,
      features: props.features,
      badge: props.badge,
      highlight: props.highlight,
      button: props.button
    }
  }

  // Autonomous mode: build from fetched plan
  if (!autonomousPlan.value) {
    return {}
  }

  const plan = autonomousPlan.value
  const priceId = getPriceId(plan)
  const isSelected = props.selectedPlanId === plan.id
  const disabled = !priceId || inFlight.value

  return {
    title: plan.name,
    description: plan.description,
    price: formatPrice(plan.price, plan.currency),
    billingCycle: `/${props.interval}`,
    features: plan.features || [],
    badge: isSelected ? 'Current Plan' : plan.badge,
    highlight: isSelected,
    button: {
      label: isSelected ? 'Current Plan' : (props.ctaLabel || 'Choose plan'),
      size: 'lg',
      block: true,
      loading: inFlight.value,
      disabled: disabled || isSelected,
      onClick: handleSelect
    }
  }
})
</script>
