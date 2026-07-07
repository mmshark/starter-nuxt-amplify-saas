<script setup lang="ts">
import type { BillingPlan } from '~/types'

definePageMeta({
  layout: false
})

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

// Composables
const {
  user,
  userAttributes,
  isAuthenticated,
  authStep,
  isLoading,
  error,
  displayName,
  email,
  getSessionInfo
} = useUser()

const {
  subscription,
  currentPlan,
  isActive,
  status,
  isLoading: billingLoading,
  error: billingError,
  fetchSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  clearError: clearBillingError
} = useBilling()

const appConfig = useAppConfig()
const runtimeConfig = useRuntimeConfig()

// Local state
const sessionInfo = ref(null)
const billingResponse = ref(null)
const selectedPlan = ref('pro')
const loadingStates = ref({
  checkout: false,
  portal: false,
  subscription: false,
  cancel: false
})

// Load session info on mount
onMounted(async () => {
  if (isAuthenticated.value) {
    sessionInfo.value = await getSessionInfo()
  }
})

// Computed properties
const availablePlans = computed(() => appConfig.billing?.plans || [])

const planOptions = computed(() => 
  availablePlans.value.map(plan => ({
    label: `${plan.name} - $${(plan.price / 100).toFixed(2)}/${plan.interval}${!plan.stripePriceId ? ' (No Price ID)' : ''}`,
    value: plan.id,
    disabled: !plan.stripePriceId
  }))
)

const systemInfo = computed(() => ({
  environment: {
    isDev: process.dev,
    runtime: process.client ? 'client' : 'server'
  },
  composables: getComposablesStatus(),
  config: {
    hasStripePublic: !!runtimeConfig.public?.stripe?.publishableKey,
    hasAmplify: !!runtimeConfig.public?.amplify
  }
}))

// Helper function to execute billing operations
const executeBillingAction = async (action: string, fn: () => Promise<any>) => {
  clearBillingError()
  billingResponse.value = null
  loadingStates.value[action] = true
  
  try {
    const result = await fn()
    billingResponse.value = result
    
    // Auto-redirect for checkout and portal
    if (result.success && result.data?.url && ['checkout', 'portal'].includes(action)) {
      window.open(result.data.url, '_blank')
    }
  } catch (err) {
    console.error(`Billing action ${action} failed:`, err)
    billingResponse.value = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  } finally {
    loadingStates.value[action] = false
  }
}

// Billing action functions
const testCheckout = () => executeBillingAction('checkout', async () => {
  const plan = availablePlans.value.find(p => p.id === selectedPlan.value)
  
  if (!plan?.stripePriceId) {
    return {
      success: false,
      error: `Plan "${selectedPlan.value}" not found or missing price ID`
    }
  }

  return createCheckoutSession(
    plan.stripePriceId,
    `${window.location.origin}/debug?checkout=success`,
    `${window.location.origin}/debug?checkout=canceled`
  )
})

const testPortal = () => executeBillingAction('portal', () => 
  createPortalSession(`${window.location.origin}/debug`)
)

const fetchSubscriptionData = () => executeBillingAction('subscription', fetchSubscription)

const testCancel = () => executeBillingAction('cancel', cancelSubscription)

// Clear responses
const clearResponses = () => {
  billingResponse.value = null
  clearBillingError()
}

// Utility functions
function getComposablesStatus(): string[] {
  const composables = []
  try {
    if (typeof useUser === 'function') composables.push('useUser')
  } catch {}
  try {
    if (typeof useBilling === 'function') composables.push('useBilling')
  } catch {}
  try {
    if (typeof useStripe === 'function') composables.push('useStripe')  
  } catch {}
  return composables
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Page header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Debug Console</h1>
        <p class="text-gray-600">Development debugging interface</p>
        <div class="mt-4">
          <NuxtLink 
            to="/"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
          >
            <Icon name="i-lucide-arrow-left" class="w-4 h-4" />
            Back to App
          </NuxtLink>
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert 
        v-if="error" 
        color="error" 
        variant="soft" 
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <!-- System Information Section -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="i-lucide-server" class="w-5 h-5" />
            <h3 class="font-semibold">System Information</h3>
          </div>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Environment:</span>
              <span class="text-sm font-medium">{{ systemInfo.environment.isDev ? 'Development' : 'Production' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Runtime:</span>
              <span class="text-sm font-medium">{{ systemInfo.environment.runtime }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Stripe Config:</span>
              <span class="text-sm font-medium">{{ systemInfo.config.hasStripePublic ? 'Available' : 'Missing' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Amplify Config:</span>
              <span class="text-sm font-medium">{{ systemInfo.config.hasAmplify ? 'Available' : 'Missing' }}</span>
            </div>
          </div>

          <!-- Key Composables -->
          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">Key Composables</h4>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="composable in systemInfo.composables" 
                :key="composable"
                class="text-sm font-medium px-2 py-1 bg-green-100 text-green-800 rounded"
              >
                {{ composable }}
              </span>
              <span 
                v-if="systemInfo.composables.length === 0"
                class="text-sm font-medium px-2 py-1 bg-red-100 text-red-800 rounded"
              >
                No key composables available
              </span>
            </div>
          </div>

          <!-- System JSON -->
          <UAccordion :items="[{
            label: 'View System Data (JSON)',
            icon: 'i-lucide-monitor'
          }]">
            <template #content>
              <div class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                <pre class="text-xs">{{ JSON.stringify(systemInfo, null, 2) }}</pre>
              </div>
            </template>
          </UAccordion>
        </div>
      </UCard>

      <!-- Profile Section -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="i-lucide-user" class="w-5 h-5" />
              <h3 class="font-semibold">Profile</h3>
            </div>
            <UButton 
              to="/debug/profile" 
              size="sm" 
              variant="soft" 
              icon="i-lucide-pen"
            >
              Edit Profile
            </UButton>
          </div>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Display Name:</span>
              <span class="text-sm font-medium">{{ displayName || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Email:</span>
              <span class="text-sm font-medium">{{ email || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">User ID:</span>
              <span class="text-sm font-medium">{{ user?.userId || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Username:</span>
              <span class="text-sm font-medium">{{ user?.username || 'N/A' }}</span>
            </div>
          </div>
          
          <!-- Profile JSON -->
          <UAccordion :items="[{
            label: 'View Profile Data (JSON)',
            icon: 'i-lucide-code-2'
          }]">
            <template #content>
              <div class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                <pre class="text-xs">{{ JSON.stringify({
                  user,
                  userAttributes,
                  displayName,
                  email
                }, null, 2) }}</pre>
              </div>
            </template>
          </UAccordion>
        </div>
      </UCard>

      <!-- Session Section -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="i-lucide-shield-check" class="w-5 h-5" />
            <h3 class="font-semibold">Session</h3>
          </div>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Authentication:</span>
              <span class="text-sm font-medium">{{ isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Auth Step:</span>
              <span class="text-sm font-medium">{{ authStep || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Loading:</span>
              <span class="text-sm font-medium">{{ isLoading ? 'Loading' : 'Ready' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Environment:</span>
              <span class="text-sm font-medium">{{ systemInfo.environment.isDev ? 'Development' : 'Production' }}</span>
            </div>
          </div>

          <!-- Session JSON -->
          <UAccordion :items="[{
            label: 'View Session Data (JSON)',
            icon: 'i-lucide-database'
          }]">
            <template #content>
              <div class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                <pre class="text-xs">{{ JSON.stringify({
                  isAuthenticated,
                  authStep,
                  isLoading,
                  error,
                  environment: systemInfo.environment,
                  sessionInfo,
                  lastFetched: new Date().toISOString()
                }, null, 2) }}</pre>
              </div>
            </template>
          </UAccordion>
        </div>
      </UCard>

      <!-- Billing Section -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="i-lucide-credit-card" class="w-5 h-5" />
            <h3 class="font-semibold">Billing</h3>
          </div>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Status:</span>
              <span class="text-sm font-medium">{{ status || 'Not loaded' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Current Plan:</span>
              <span class="text-sm font-medium">{{ currentPlan?.name || 'Unknown' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Stripe Public Key:</span>
              <span class="text-sm font-medium font-mono">{{ runtimeConfig.public?.stripe?.publishableKey?.substring(0, 20) || 'Not set' }}...</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Stripe Secret Key:</span>
              <span class="text-sm font-medium font-mono">{{ runtimeConfig.stripe?.secretKey?.substring(0, 12) || 'Not set' }}...</span>
            </div>
          </div>

          <!-- Plan Selection -->
          <div class="space-y-3">
            <h4 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">Plan Selection</h4>
            <div class="space-y-2">
              <div class="flex items-center gap-4">
                <span class="text-sm font-medium text-gray-600">Select Plan:</span>
                <USelect
                  v-model="selectedPlan"
                  :items="planOptions"
                  placeholder="Select a plan"
                  class="w-64"
                />
              </div>
              <div class="text-xs text-gray-500">
                Total plans: {{ availablePlans.length }} | With Price IDs: {{ availablePlans.filter(p => p.stripePriceId).length }} | Selected: {{ selectedPlan }}
              </div>
              
              <div v-if="availablePlans.length === 0" class="text-sm text-amber-600">
                No billing plans found in app configuration
              </div>
            </div>
          </div>

          <!-- Billing Actions -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-gray-700">Stripe API Test</h4>
              <UButton
                @click="clearResponses"
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-x"
                :disabled="!billingResponse && !billingError"
              >
                Clear
              </UButton>
            </div>
            <div class="flex flex-wrap gap-3">
              <UButton
                @click="testCheckout"
                :loading="loadingStates.checkout"
                :disabled="availablePlans.length === 0"
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-shopping-cart"
              >
                Test Checkout
              </UButton>
              
              <UButton
                @click="testPortal"
                :loading="loadingStates.portal"
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-settings"
              >
                Test Portal
              </UButton>
              
              <UButton
                @click="fetchSubscriptionData"
                :loading="loadingStates.subscription"
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-refresh-cw"
              >
                Get Subscription
              </UButton>
              
              <UButton
                @click="testCancel"
                :loading="loadingStates.cancel"
                color="error"
                variant="solid"
                size="sm"
                icon="i-lucide-x-circle"
              >
                Test Cancel
              </UButton>
            </div>
          </div>

          <!-- Billing Error -->
          <UAlert
            v-if="billingError"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            title="Billing Error"
            :description="billingError"
            :close-button="{ icon: 'i-lucide-x', color: 'neutral', variant: 'link', padded: false }"
            @close="clearBillingError"
          />

          <!-- Billing Response -->
          <div v-if="billingResponse" class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-gray-700">API Response</h4>
              <UBadge 
                :color="billingResponse.success ? 'success' : 'error'"
                variant="soft"
              >
                {{ billingResponse.success ? 'Success' : 'Failed' }}
              </UBadge>
            </div>
            <div class="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto">
              <pre class="text-xs">{{ JSON.stringify(billingResponse, null, 2) }}</pre>
            </div>
          </div>

          <!-- Billing JSON -->
          <UAccordion :items="[{
            label: 'View Billing Data (JSON)',
            icon: 'i-lucide-receipt'
          }]">
            <template #content>
              <div class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                <pre class="text-xs">{{ JSON.stringify({
                  // App Configuration Plans
                  appPlans: {
                    totalPlans: availablePlans.length,
                    plansWithPriceIds: availablePlans.filter(p => p.stripePriceId).length,
                    allPlans: availablePlans,
                    selectOptions: planOptions,
                    selectedPlan: selectedPlan
                  },
                  
                  // Billing Composable State
                  billingState: {
                    subscription,
                    currentPlan,
                    status,
                    isActive,
                    error: billingError,
                    isLoading: billingLoading
                  },
                  
                  // Debug Info
                  debugInfo: {
                    lastResponse: billingResponse,
                    lastTested: new Date().toISOString(),
                    loadingStates
                  }
                }, null, 2) }}</pre>
              </div>
            </template>
          </UAccordion>
        </div>
      </UCard>
    </div>
  </div>
</template>
