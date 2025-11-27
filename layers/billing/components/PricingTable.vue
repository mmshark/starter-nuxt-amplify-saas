<template>
  <UPricingTable v-bind="effectiveProps" />
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
  // All UPricingTable props - pass-through support
  plans?: any[]
  orientation?: 'horizontal' | 'vertical'
  compact?: boolean
  scale?: boolean
  // Custom props for autonomous mode
  interval?: 'monthly' | 'yearly'
  ctaLabel?: string
  selectedPlanId?: string
  controlled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  compact: false,
  scale: false,
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

// Check if component is in pass-through mode (plans prop provided)
const isPassThroughMode = computed(() => {
  return !!props.plans
})

// Autonomous mode: fetch plans
const autonomousPlans = ref<Plan[] | null>(null)
const inFlightPlanId = ref<string | null>(null)

const fetchPublicPlans = async () => {
  try {
    const resp = await $fetch('/api/billing/plans') as any
    const plans = resp?.data?.plans || []

    autonomousPlans.value = plans.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: props.interval === 'yearly' ? p.yearlyPrice : p.monthlyPrice,
      interval: props.interval,
      currency: p.currency,
      features: [],
      stripeMonthlyPriceId: p.stripeMonthlyPriceId,
      stripeYearlyPriceId: p.stripeYearlyPriceId
    }))
  } catch (e) {
    console.error('Failed to load billing plans', e)
    autonomousPlans.value = []
  }
}

// Initialize autonomous data when not in pass-through mode
onMounted(() => {
  if (!isPassThroughMode.value) {
    void fetchPublicPlans()
  }
})

// Helpers
const getPriceId = (plan: Plan): string | null => {
  if (plan.stripePriceId) return plan.stripePriceId
  if (props.interval === 'yearly') return plan.stripeYearlyPriceId || null
  return plan.stripeMonthlyPriceId || null
}

const formatPrice = (value: number, currency?: string): string => {
  const isCents = value > 10
  const amount = isCents ? value / 100 : value
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

const handleSelect = async (plan: Plan) => {
  if (props.controlled) {
    emit('select', plan)
    const priceId = getPriceId(plan)
    if (priceId) emit('checkout', { priceId, planId: plan.id, billingInterval: props.interval })
    return
  }

  const priceId = getPriceId(plan)
  if (!priceId) return

  try {
    inFlightPlanId.value = plan.id
    const result = await billing.createCheckoutSession({
      priceId,
      planId: plan.id,
      billingInterval: props.interval
    })
    if (result?.success && result?.data?.url) {
      if (process.client) {
        window.location.href = result.data.url
      } else {
        await navigateTo(result.data.url, { external: true })
      }
    } else {
      useToast().add({
        title: 'Checkout error',
        description: result?.error || 'No checkout URL returned',
        color: 'red'
      })
    }
  } finally {
    inFlightPlanId.value = null
  }
}

// Build effective props for UPricingTable
const effectiveProps = computed(() => {
  // Pass-through mode: use provided props directly
  if (isPassThroughMode.value) {
    return {
      plans: props.plans,
      orientation: props.orientation,
      compact: props.compact,
      scale: props.scale
    }
  }

  // Autonomous mode: build from fetched plans
  if (!autonomousPlans.value) {
    return {
      plans: [],
      orientation: props.orientation,
      compact: props.compact,
      scale: props.scale
    }
  }

  const uiPlans = autonomousPlans.value.map((plan) => {
    const priceId = getPriceId(plan)
    const isSelected = props.selectedPlanId === plan.id
    const disabled = !priceId || !!inFlightPlanId.value

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
        loading: inFlightPlanId.value === plan.id,
        disabled: disabled || isSelected,
        onClick: () => handleSelect(plan)
      }
    }
  })

  return {
    plans: uiPlans,
    orientation: props.orientation,
    compact: props.compact,
    scale: props.scale
  }
})
</script>

