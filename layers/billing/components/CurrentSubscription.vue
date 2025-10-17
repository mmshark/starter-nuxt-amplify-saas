<template>
  <UCard class="overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Current Subscription
        </h2>
        <UBadge
          v-if="effectiveSubscription && effectiveSubscription.plan.price > 0"
          :color="getStatusColor(effectiveSubscription.status)"
          variant="subtle"
          size="lg"
        >
          {{ effectiveSubscription.status.replace('_', ' ').toUpperCase() }}
        </UBadge>
      </div>
    </template>

    <!-- Skeleton -->
    <div v-if="showSkeleton" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <USkeleton class="h-7 w-48 rounded" />
          <div class="mt-3 space-y-2">
            <USkeleton class="h-8 w-32 rounded" />
            <USkeleton class="h-4 w-40 rounded" />
          </div>
        </div>
        <USkeleton class="h-9 w-32 rounded" />
      </div>
    </div>

    <!-- Plan Information with action button -->
    <div v-else class="flex items-center justify-between">
      <div>
        <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ effectiveSubscription?.plan.name }}
        </h3>
        <p class="text-3xl font-bold text-primary-600 mt-2">
          ${{ effectiveSubscription?.plan.price }}
          <span class="text-lg font-normal text-gray-600 dark:text-gray-400">
            /{{ effectiveSubscription?.plan.interval }}
          </span>
        </p>

        <!-- Billing information integrated from footer -->
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-3">
          <p v-if="effectiveSubscription && effectiveSubscription.plan.price > 0">Next billing: {{ formatDate(effectiveSubscription.currentPeriodEnd) }}</p>
          <p v-if="effectiveSubscription?.cancelAtPeriodEnd" class="text-amber-600 dark:text-amber-400 mt-1">
            ⚠️ Subscription will cancel at the end of the current period
          </p>
        </div>
      </div>

      <UButton
        variant="outline"
        @click="handleClick"
        :loading="effectiveLoading"
      >
        Change Plan
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface PlanInfo {
  name: string
  price: number
  interval: string
  features: string[]
}

interface UsageStats {
  label: string
  current: number
  limit: number
  percentage: number
}

interface Subscription {
  plan: PlanInfo
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

interface Props {
  subscription?: Subscription | null
  usageStats?: UsageStats[]
  loading?: boolean
  controlled?: boolean
  skeleton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  usageStats: () => [],
  controlled: false,
  skeleton: true
})

const emit = defineEmits<{
  openPortal: [flowType?: string]
}>()

// Dual-mode: props first, fallback to useBilling
const billing = useBilling()
const effectiveSubscription = computed<Subscription | null>(() => {
  if (props.subscription) return props.subscription
  const s = billing.subscription.value
  if (!s) return null
  return {
    plan: s.plan,
    status: s.subscription.status,
    currentPeriodEnd: s.subscription.currentPeriodEnd,
    cancelAtPeriodEnd: s.subscription.cancelAtPeriodEnd
  }
})

// Local per-action loading to avoid animating other buttons
const localLoading = ref(false)
const effectiveLoading = computed(() => props.loading || localLoading.value)

// Show skeleton only while loading data for autonomous mode
const showSkeleton = computed(() => {
  if (!props.skeleton) return false
  // Controlled mode relies on parent-provided loading; show skeleton only if loading and no data
  if (props.controlled || props.subscription !== undefined) {
    return !!props.loading && !props.subscription
  }
  // Avoid empty-state flash before first load finishes
  if (!billing.initialized.value) return true
  // Autonomous: while subscription is loading and not yet available
  return billing.subscriptionLoading.value && !effectiveSubscription.value
})

const handleClick = async () => {
  if (props.controlled || props.subscription) {
    emit('openPortal', 'subscription_update')
    return
  }

  try {
    localLoading.value = true
    await billing.openPortal({ flow_type: 'subscription_update' })
  } finally {
    localLoading.value = false
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'success'
    case 'trialing': return 'info'
    case 'past_due': return 'warning'
    case 'canceled': return 'error'
    default: return 'neutral'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>
