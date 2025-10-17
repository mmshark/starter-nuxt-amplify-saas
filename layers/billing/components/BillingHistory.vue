<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-receipt" class="w-5 h-5 text-gray-600" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Invoices
          </h2>
        </div>
      </div>
    </template>

    <!-- Loading State -->
    <div v-if="showSkeleton" class="space-y-3">
      <div v-for="n in 3" :key="n" class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <USkeleton class="w-10 h-10 rounded-lg" />
            <div class="space-y-2">
              <USkeleton class="h-4 w-32 rounded" />
              <USkeleton class="h-3 w-24 rounded" />
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right space-y-2">
              <USkeleton class="h-4 w-16 rounded" />
              <USkeleton class="h-4 w-12 rounded" />
            </div>
            <USkeleton class="h-8 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="effectiveInvoices.length === 0" class="text-center py-8">
      <UIcon name="i-lucide-receipt" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-600 dark:text-gray-400">No invoices found</p>
      <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
        Invoices will appear here once you make payments
      </p>
    </div>

    <!-- Invoices List -->
    <div v-else class="space-y-3">
      <div
        v-for="invoice in effectiveInvoices"
        :key="invoice.id"
        class="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <UIcon name="i-lucide-file-text" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              Invoice #{{ invoice.number }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(invoice.date) }}
            </p>
            <p v-if="invoice.description" class="text-xs text-gray-500 dark:text-gray-500">
              {{ invoice.description }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="font-semibold text-gray-900 dark:text-white">
              ${{ formatAmount(invoice.amount) }}
            </p>
            <UBadge
              :color="getInvoiceStatusColor(invoice.status)"
              variant="subtle"
              size="sm"
            >
              {{ invoice.status.toUpperCase() }}
            </UBadge>
          </div>

          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-download"
            @click="handleDownload(invoice.id)"
          >
            Download
          </UButton>
        </div>
      </div>
    </div>

    <template #footer v-if="effectiveInvoices.length > 0">
      <div class="flex justify-between items-center">
        <UButton
          variant="ghost"
          @click="handleViewAll()"
          :loading="effectivePortalLoading"
        >
          View All Invoices
        </UButton>

        <UButton
          v-if="effectiveHasMore"
          variant="outline"
          @click="handleLoadMore()"
          :loading="effectiveInvoicesLoading"
        >
          Load More
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
interface Invoice {
  id: string
  number: string
  date: string
  amount: number
  status: string
  description?: string
  downloadUrl?: string
  hostedUrl?: string
  currency?: string
}

interface Props {
  invoices?: Invoice[]
  invoicesLoading?: boolean
  portalLoading?: boolean
  hasMore?: boolean
  controlled?: boolean
  skeleton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  invoicesLoading: false,
  portalLoading: false,
  hasMore: false,
  controlled: false,
  skeleton: true
})

const emit = defineEmits<{
  downloadInvoice: [invoiceId: string]
  viewAllInvoices: []
  loadMore: []
}>()

// Dual-mode: props or useBilling fallback
const billing = useBilling()
const effectiveInvoices = computed<Invoice[]>(() => props.invoices ?? (billing.invoices.value?.invoices || []))
const effectiveInvoicesLoading = computed<boolean>(() => props.invoicesLoading || billing.invoicesLoading.value)
const effectivePortalLoading = computed<boolean>(() => props.portalLoading || billing.isPortalLoading.value)
const effectiveHasMore = computed<boolean>(() => props.hasMore || billing.invoices.value?.hasMore || false)

const showSkeleton = computed(() => {
  if (!props.skeleton) return false
  if (props.controlled || props.invoices !== undefined) {
    return !!props.invoicesLoading && (props.invoices?.length ?? 0) === 0
  }
  // Avoid empty-state flash before first load finishes
  if (!billing.initialized.value) return true
  return billing.invoicesLoading.value && effectiveInvoices.value.length === 0
})

const handleDownload = (invoiceId: string) => {
  if (props.controlled || props.invoices) {
    emit('downloadInvoice', invoiceId)
  } else {
    const invoice = billing.invoices.value?.invoices.find(inv => inv.id === invoiceId)
    if (invoice?.downloadUrl) {
      window.open(invoice.downloadUrl, '_blank')
    } else {
      void billing.updateSubscription()
    }
  }
}

const handleViewAll = () => {
  if (props.controlled || props.invoices) {
    emit('viewAllInvoices')
  } else {
    void billing.updateSubscription()
  }
}

const handleLoadMore = () => {
  if (props.controlled || props.invoices) {
    emit('loadMore')
  } else {
    void billing.loadMoreInvoices()
  }
}

const getInvoiceStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'success'
    case 'pending': return 'warning'
    case 'failed': return 'error'
    case 'draft': return 'neutral'
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

const formatAmount = (amount: number) => {
  return amount.toFixed(2)
}
</script>
