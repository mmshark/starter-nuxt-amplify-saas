<template>
  <UPricingPlans v-bind="effectiveProps" />
</template>

<script setup lang="ts">
interface InputPlan {
  id: string
  name: string
  description?: string
  price: number
  interval: 'monthly' | 'yearly'
  currency?: string
  features?: string[]
  badge?: string
  trialPeriodDays?: number | null
  stripePriceId?: string // unified field for controlled mode convenience
  stripeMonthlyPriceId?: string
  stripeYearlyPriceId?: string
}

interface Props {
  // Custom props for internal format (InputPlan[])
  plans?: InputPlan[] | null
  loading?: boolean
  controlled?: boolean
  interval?: 'monthly' | 'yearly'
  ctaLabel?: string
  selectedPlanId?: string
  /** Disable every plan CTA (e.g. read-only catalog for non-owners) */
  disabled?: boolean
  // All UPricingPlans props - for pass-through mode
  orientation?: 'horizontal' | 'vertical'
  compact?: boolean
  scale?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  controlled: false,
  interval: 'monthly',
  ctaLabel: 'Choose Plan',
  selectedPlanId: undefined,
  disabled: false,
  orientation: 'horizontal',
  compact: false,
  scale: false
})

const emit = defineEmits<{
  select: [plan: InputPlan]
  checkout: [payload: { priceId: string, planId: string, billingInterval: 'monthly' | 'yearly' }]
}>()

// Composable
const billing = useBilling()

// Local state for autonomous loading per-action
const inFlightPlanId = ref<string | null>(null)
const effectiveLoading = computed(() => props.loading || !!inFlightPlanId.value)

// Derived plans (autonomous: fetch from public plans API)
const autonomousPlans = ref<InputPlan[] | null>(null)

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
      features: Array.isArray(p.features) ? p.features : [],
      trialPeriodDays: p.trialPeriodDays ?? null,
      stripeMonthlyPriceId: p.stripeMonthlyPriceId,
      stripeYearlyPriceId: p.stripeYearlyPriceId
    }))
  } catch (e) {
    console.error('Failed to load public billing plans', e)
    autonomousPlans.value = []
  }
}

// Initialize autonomous data when uncontrolled
onMounted(() => {
  if (!props.controlled && props.plans === undefined) {
    void fetchPublicPlans()
  }
})

const effectivePlans = computed<InputPlan[]>(() => {
  if (props.plans) return props.plans
  return autonomousPlans.value || []
})

// Helpers
const getPriceId = (plan: InputPlan): string | null => {
  if (plan.stripePriceId) return plan.stripePriceId
  if (props.interval === 'yearly') return plan.stripeYearlyPriceId || null
  return plan.stripeMonthlyPriceId || null
}

// Map to Nuxt UI <UPricingPlans> format
const uiPlans = computed<any[]>(() => {
  return effectivePlans.value.map((plan) => {
    const priceId = getPriceId(plan)
    const isSelected = props.selectedPlanId === plan.id
    const disabled = !priceId || effectiveLoading.value || props.disabled

    return {
      title: plan.name,
      description: plan.description,
      price: formatPrice(plan.price, plan.currency),
      billingCycle: `/${props.interval}`,
      features: plan.features || [],
      badge: isSelected
        ? 'Current Plan'
        : (plan.trialPeriodDays ? `${plan.trialPeriodDays}-day free trial` : plan.badge),
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
})

// Build effective props for UPricingPlans
const effectiveProps = computed(() => {
  return {
    plans: uiPlans.value,
    orientation: props.orientation,
    compact: props.compact,
    scale: props.scale
  }
})

const handleSelect = async (plan: InputPlan) => {
  if (props.controlled || props.plans !== undefined) {
    emit('select', plan)
    const priceId = getPriceId(plan)
    if (priceId) emit('checkout', { priceId, planId: plan.id, billingInterval: props.interval })
    return
  }

  const priceId = getPriceId(plan)
  if (!priceId) return

  try {
    inFlightPlanId.value = plan.id

    // A workspace that already pays cannot start a second subscription — plan
    // changes go through the Customer Portal (Stripe handles proration). Mirrors
    // the server-side 409 guard in checkout.post.ts (E05 Phase 3).
    if (billing.hasActivePaidSubscription.value) {
      await billing.updateSubscription()
      return
    }

    const result = await billing.createCheckoutSession({
      priceId,
      planId: plan.id,
      billingInterval: props.interval
    })
    if (result?.success && result?.data?.url) {
      // Use window.location for maximum reliability opening Stripe
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
    inFlightPlanId.value = null
  }
}
</script>
