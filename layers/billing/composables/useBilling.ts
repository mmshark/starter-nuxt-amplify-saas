export interface StripePortalOptions {
  flow_type?: 'subscription_update' | 'subscription_cancel' | 'payment_method_update' | 'subscription_update_confirm'
  return_url?: string
  configuration_id?: string
  discount_id?: string
}

interface SubscriptionData {
  subscription: any
  plan: any
  paymentMethod: any
  usage: any[]
}

interface InvoicesData {
  invoices: any[]
  hasMore: boolean
  totalCount: number
}

// Core logic: Environment-agnostic where possible
export const useBilling = (workspaceId: string | Ref<string>) => {
  const id = computed(() => unref(workspaceId))
  const key = computed(() => `billing:${id.value}`)

  // State keyed by workspaceId
  const isPortalLoading = useState<boolean>(() => `${key.value}:isPortalLoading`, () => false)
  const subscription = useState<SubscriptionData | null>(() => `${key.value}:subscription`, () => null)
  const invoices = useState<InvoicesData | null>(() => `${key.value}:invoices`, () => null)
  const subscriptionLoading = useState<boolean>(() => `${key.value}:subscriptionLoading`, () => false)
  const invoicesLoading = useState<boolean>(() => `${key.value}:invoicesLoading`, () => false)
  const subscriptionError = useState<string | null>(() => `${key.value}:subscriptionError`, () => null)
  const invoicesError = useState<string | null>(() => `${key.value}:invoicesError`, () => null)
  const initialized = useState<boolean>(() => `${key.value}:initialized`, () => false)

  const inFlight = useState<Record<string, boolean>>(() => `${key.value}:inFlight`, () => ({
    init: false,
    subscription: false,
    invoices: false,
    portal: false
  }))

  // Computed loading state
  const isLoading = computed(() =>
    isPortalLoading.value || subscriptionLoading.value || invoicesLoading.value
  )

  // Computed error state
  const error = computed(() =>
    subscriptionError.value || invoicesError.value
  )

  // Computed subscription state helpers
  const hasActivePaidSubscription = computed(() => {
    return subscription.value?.subscription?.status === 'active' &&
           subscription.value?.plan?.price > 0
  })

  const currentPlanId = computed(() => {
    return subscription.value?.subscription?.planId || 'free'
  })

  const isFreePlan = computed(() => {
    return currentPlanId.value === 'free' || subscription.value?.plan?.price === 0
  })

  // Create Stripe Customer Portal URL (no navigation)
  const createPortalUrl = async (options: StripePortalOptions = {}) => {
    const response = await $fetch('/api/billing/portal', {
      method: 'POST',
      body: {
        workspaceId: id.value,
        flow_type: options.flow_type || 'subscription_update',
        return_url: options.return_url,
        configuration_id: options.configuration_id,
        discount_id: options.discount_id
      }
    })

    if (!response.success || !response.data?.url) {
      throw new Error('No portal URL received')
    }

    return response.data.url as string
  }

  // Create Stripe Customer Portal session (returns full response)
  const createPortalSession = async (returnUrl?: string) => {
    const response = await $fetch('/api/billing/portal', {
      method: 'POST',
      body: {
        workspaceId: id.value,
        flow_type: 'subscription_update',
        return_url: returnUrl
      }
    })

    return response
  }

  // Create Stripe Checkout session
  const createCheckoutSession = async (
    arg1: { priceId: string, planId: string, billingInterval: 'monthly' | 'yearly' } | string,
    planIdMaybe?: string,
    billingIntervalMaybe?: 'monthly' | 'yearly'
  ) => {
    let priceId: string
    let planId: string
    let billingInterval: 'monthly' | 'yearly'

    if (typeof arg1 === 'string') {
      priceId = arg1

      // Derive planId and interval from public plans API
      const plansResp = await $fetch('/api/billing/plans') as any
      const plans = plansResp?.data?.plans || []
      const match = plans.find((p: any) => p.stripeMonthlyPriceId === priceId || p.stripeYearlyPriceId === priceId)

      if (!match) {
        throw new Error('Unknown priceId; not found in available plans')
      }

      planId = match.id
      billingInterval = match.stripeYearlyPriceId === priceId ? 'yearly' : 'monthly'
    } else {
      priceId = arg1.priceId
      planId = arg1.planId
      billingInterval = arg1.billingInterval
    }

    const response = await $fetch('/api/billing/checkout', {
      method: 'POST',
      body: {
        workspaceId: id.value,
        priceId,
        planId,
        billingInterval
      }
    })

    return response
  }

  // Portal functionality (navigate and refresh)
  const openPortal = async (options: StripePortalOptions = {}) => {
    if (isPortalLoading.value || inFlight.value.portal) return

    try {
      isPortalLoading.value = true
      inFlight.value.portal = true

      const url = await createPortalUrl(options)

      // Redirect to Stripe Customer Portal
      await navigateTo(url, { external: true })

      // Auto-refresh subscription data when user returns
      await nextTick()
      await refreshSubscription()

    } catch (error: any) {
      console.error('Portal error:', error)

      // Show error toast
      useToast().add({
        title: 'Portal Error',
        description: error.data?.message || error.message || 'Failed to open billing portal',
        color: 'red'
      })
    } finally {
      isPortalLoading.value = false
      inFlight.value.portal = false
    }
  }

  // Data fetching methods
  const fetchSubscription = async () => {
    if (subscriptionLoading.value || inFlight.value.subscription) return

    try {
      subscriptionLoading.value = true
      inFlight.value.subscription = true
      subscriptionError.value = null

      const response = await $fetch(`/api/billing/subscription?workspaceId=${id.value}`)

      if (response.success) {
        subscription.value = response.data
      } else {
        throw new Error('Failed to fetch subscription data')
      }

    } catch (error: any) {
      console.error('Subscription fetch error:', error)
      subscriptionError.value = error.data?.message || error.message || 'Failed to fetch subscription'

      useToast().add({
        title: 'Subscription Error',
        description: subscriptionError.value,
        color: 'red'
      })
    } finally {
      subscriptionLoading.value = false
      inFlight.value.subscription = false
    }
  }

  const fetchInvoices = async (options: { limit?: number, startingAfter?: string } = {}) => {
    if (invoicesLoading.value || inFlight.value.invoices) return

    try {
      invoicesLoading.value = true
      inFlight.value.invoices = true
      invoicesError.value = null

      const query = new URLSearchParams()
      query.append('workspaceId', id.value)
      if (options.limit) query.append('limit', options.limit.toString())
      if (options.startingAfter) query.append('startingAfter', options.startingAfter)

      const response = await $fetch(`/api/billing/invoices?${query.toString()}`)

      if (response.success) {
        if (options.startingAfter && invoices.value) {
          // Append to existing invoices (pagination)
          invoices.value.invoices.push(...response.data.invoices)
          invoices.value.hasMore = response.data.hasMore
        } else {
          // Replace invoices (initial load)
          invoices.value = response.data
        }
      } else {
        throw new Error('Failed to fetch invoices')
      }

    } catch (error: any) {
      console.error('Invoices fetch error:', error)
      invoicesError.value = error.data?.message || error.message || 'Failed to fetch invoices'

      useToast().add({
        title: 'Invoices Error',
        description: invoicesError.value,
        color: 'red'
      })
    } finally {
      invoicesLoading.value = false
      inFlight.value.invoices = false
    }
  }

  // Refresh methods
  const refreshSubscription = async () => {
    await fetchSubscription()
  }

  const refreshInvoices = async () => {
    invoices.value = null // Clear existing data
    await fetchInvoices()
  }

  const refreshAll = async () => {
    await Promise.all([
      refreshSubscription(),
      refreshInvoices()
    ])
  }

  // Convenience methods for portal flows (existing functionality)
  const updateSubscription = async (returnUrl?: string) => {
    await openPortal({
      flow_type: 'subscription_update',
      return_url: returnUrl
    })
  }

  const cancelSubscription = async (returnUrl?: string) => {
    await openPortal({
      flow_type: 'subscription_cancel',
      return_url: returnUrl
    })
  }

  const updatePaymentMethod = async (returnUrl?: string) => {
    await openPortal({
      flow_type: 'payment_method_update',
      return_url: returnUrl
    })
  }

  const confirmSubscriptionUpdate = async (discountId?: string, returnUrl?: string) => {
    await openPortal({
      flow_type: 'subscription_update_confirm',
      discount_id: discountId,
      return_url: returnUrl
    })
  }

  // Load more invoices (pagination)
  const loadMoreInvoices = async () => {
    if (!invoices.value?.hasMore || invoicesLoading.value) return

    const lastInvoice = invoices.value.invoices.slice(-1)[0]
    if (lastInvoice) {
      await fetchInvoices({
        limit: 10,
        startingAfter: lastInvoice.id
      })
    }
  }

  // Ensure one-time initialization
  const ensureInitialized = async () => {
    if (initialized.value || inFlight.value.init) {
      console.log('[useBilling] Already initialized or in flight, skipping')
      return
    }
    console.log('[useBilling] Starting initialization...')
    try {
      inFlight.value.init = true
      await Promise.all([
        fetchSubscription(),
        fetchInvoices({ limit: 10 })
      ])
      initialized.value = true
      console.log('[useBilling] Initialization complete')
    } finally {
      inFlight.value.init = false
    }
  }

  // Clear errors manually
  const clearError = () => {
    subscriptionError.value = null
    invoicesError.value = null
  }

  return {
    // Data (readonly state from useState)
    subscription: readonly(subscription),
    invoices: readonly(invoices),

    // Loading states
    isLoading: readonly(isLoading),
    subscriptionLoading: readonly(subscriptionLoading),
    invoicesLoading: readonly(invoicesLoading),
    isPortalLoading: readonly(isPortalLoading),
    initialized: readonly(initialized),

    // Error states
    error: readonly(error),
    subscriptionError: readonly(subscriptionError),
    invoicesError: readonly(invoicesError),

    // Subscription state helpers
    hasActivePaidSubscription: readonly(hasActivePaidSubscription),
    currentPlanId: readonly(currentPlanId),
    isFreePlan: readonly(isFreePlan),

    // Portal methods
    createPortalUrl,
    createPortalSession,
    createCheckoutSession,
    openPortal,
    updateSubscription,
    cancelSubscription,
    updatePaymentMethod,
    confirmSubscriptionUpdate,

    // Data methods
    fetchSubscription,
    fetchInvoices,
    refreshSubscription,
    refreshInvoices,
    refreshAll,
    loadMoreInvoices,
    ensureInitialized,
    clearError
  }
}

// Server-only export: Isolated instance per request (throw error if called on client)
export const useBillingServer = (workspaceId: string) => {
  if (import.meta.client) throw new Error('useBillingServer is server-only')
  return useBilling(workspaceId)
}
