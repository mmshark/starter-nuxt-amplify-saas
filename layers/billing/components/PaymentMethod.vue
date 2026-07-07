<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-credit-card" class="w-5 h-5 text-gray-600" />
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Payment Method
        </h2>
      </div>
    </template>

    <div v-if="showSkeleton" class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <USkeleton class="w-12 h-8 rounded" />
        <div class="space-y-2">
          <USkeleton class="h-4 w-48 rounded" />
          <USkeleton class="h-3 w-40 rounded" />
        </div>
      </div>
      <USkeleton class="h-9 w-44 rounded" />
    </div>

    <div v-else class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
          <UIcon name="i-lucide-credit-card" class="w-6 h-6 text-white" />
        </div>
        <div>
          <template v-if="effectivePaymentMethod">
            <p class="font-medium text-gray-900 dark:text-white">
              {{ effectivePaymentMethod.brand.toUpperCase() }} •••• {{ effectivePaymentMethod.last4 }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Expires {{ effectivePaymentMethod.expMonth }}/{{ effectivePaymentMethod.expYear }}
            </p>
          </template>
          <template v-else>
            <p class="font-medium text-gray-900 dark:text-white">
              No payment method
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Add a payment method to manage your subscription
            </p>
          </template>
        </div>
      </div>

      <UButton
        variant="outline"
        :loading="effectiveLoading"
        @click="handleClick"
      >
        {{ effectivePaymentMethod ? 'Update' : 'Add Payment Method' }}
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface PaymentMethod {
  type: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface Props {
  paymentMethod?: PaymentMethod | null
  loading?: boolean
  controlled?: boolean
  skeleton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  controlled: false,
  skeleton: true
})

const emit = defineEmits<{
  openPortal: [flowType?: string]
}>()

// Dual-mode: props or useBilling fallback
const billing = useBilling()
const effectivePaymentMethod = computed<PaymentMethod | null>(() => {
  if (props.paymentMethod) return props.paymentMethod
  return (billing.subscription.value?.paymentMethod as PaymentMethod | undefined) ?? null
})

// Local per-action loading
const localLoading = ref(false)
const effectiveLoading = computed(() => props.loading || localLoading.value)

const showSkeleton = computed(() => {
  if (!props.skeleton) return false
  if (props.controlled || props.paymentMethod !== undefined) {
    return !!props.loading && !props.paymentMethod
  }
  // Show skeleton ONLY if we don't have data yet AND we're loading
  // Hide skeleton as soon as data is available, even if not fully initialized
  return !effectivePaymentMethod.value && (billing.subscriptionLoading.value || !billing.initialized.value)
})

const handleClick = async () => {
  if (props.controlled || props.paymentMethod !== undefined) {
    emit('openPortal', 'payment_method_update')
    return
  }

  try {
    localLoading.value = true
    await billing.openPortal({ flow_type: 'payment_method_update' })
  } finally {
    localLoading.value = false
  }
}
</script>
