<script setup lang="ts">
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/amplify/data/resource'
definePageMeta({
  layout: false
})

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

// State
const plans = ref([])
const loading = ref(false)
const error = ref('')

// Fetch subscription plans using Amplify Data (client)
const fetchPlans = async () => {
  loading.value = true
  error.value = ''

  try {
    const client = generateClient<Schema>()
    const { data, errors } = await client.models.SubscriptionPlan.list({
      filter: { isActive: { eq: true } }
    })

    if (errors && errors.length > 0) {
      throw new Error('Failed to fetch plans')
    }

    plans.value = data || []
  } catch (err) {
    console.error('Error fetching plans:', err)
    error.value = err.message || 'Unknown error occurred'
  } finally {
    loading.value = false
  }
}

// Load plans on mount
onMounted(() => {
  fetchPlans()
})

// Computed
const hasPlans = computed(() => plans.value.length > 0)
const activePlans = computed(() => plans.value.filter(plan => plan.isActive !== false))
const inactivePlans = computed(() => plans.value.filter(plan => plan.isActive === false))

// Format currency
const formatPrice = (price: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price)
}

// Format plan status
const getPlanStatus = (plan: any) => {
  if (plan.isActive === false) return { color: 'error', label: 'Inactive' }
  if (plan.planId === 'free' || plan.id === 'free') return { color: 'neutral', label: 'Free Plan' }
  if (plan.stripeMonthlyPriceId && plan.stripeYearlyPriceId) return { color: 'success', label: 'Complete' }
  if (plan.stripeMonthlyPriceId || plan.stripeYearlyPriceId) return { color: 'warning', label: 'Partial' }
  return { color: 'error', label: 'No Pricing' }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Page header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Subscription Plans Debug</h1>
        <p class="text-gray-600">View all subscription plans from the database</p>
        <div class="mt-4">
          <NuxtLink
            to="/debug"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
          >
            <Icon name="i-lucide-arrow-left" class="w-4 h-4" />
            Back to Debug
          </NuxtLink>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="flex items-center gap-3">
          <Icon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
          <span class="text-gray-600">Loading subscription plans...</span>
        </div>
      </div>

      <!-- Error State -->
      <UAlert
        v-if="error && !loading"
        color="error"
        variant="soft"
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <!-- Plans Summary -->
      <UCard v-if="hasPlans && !loading">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="i-lucide-bar-chart-3" class="w-5 h-5" />
              <h3 class="font-semibold">Plans Summary</h3>
            </div>
            <UButton
              @click="fetchPlans"
              size="sm"
              variant="soft"
              icon="i-lucide-refresh-cw"
              :loading="loading"
            >
              Refresh
            </UButton>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ plans.length }}</div>
            <div class="text-sm text-blue-800">Total Plans</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ activePlans.length }}</div>
            <div class="text-sm text-green-800">Active Plans</div>
          </div>
          <div class="text-center p-4 bg-red-50 rounded-lg">
            <div class="text-2xl font-bold text-red-600">{{ inactivePlans.length }}</div>
            <div class="text-sm text-red-800">Inactive Plans</div>
          </div>
          <div class="text-center p-4 bg-purple-50 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">{{ plans.filter(p => p.planId === 'free').length }}</div>
            <div class="text-sm text-purple-800">Free Plans</div>
          </div>
        </div>
      </UCard>

      <!-- Plans List -->
      <div v-if="hasPlans && !loading" class="space-y-4">
        <UCard
          v-for="plan in plans"
          :key="plan.planId"
          :class="{ 'opacity-60': !plan.isActive }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <Icon
                  :name="plan.planId === 'free' ? 'i-lucide-gift' : plan.planId === 'enterprise' ? 'i-lucide-building' : 'i-lucide-zap'"
                  class="w-6 h-6"
                  :class="{
                    'text-gray-500': plan.planId === 'free',
                    'text-blue-500': plan.planId === 'pro',
                    'text-purple-500': plan.planId === 'enterprise'
                  }"
                />
                <div>
                  <h3 class="font-semibold text-lg">{{ plan.name }}</h3>
                  <p class="text-sm text-gray-600">{{ plan.description || 'No description' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :color="getPlanStatus(plan).color"
                  variant="soft"
                >
                  {{ getPlanStatus(plan).label }}
                </UBadge>
                <UBadge
                  v-if="!plan.isActive"
                  color="error"
                  variant="soft"
                >
                  Inactive
                </UBadge>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Pricing -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">Pricing</h4>
                <div class="space-y-1">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Monthly:</span>
                    <span class="text-sm font-medium">{{ formatPrice(plan.monthlyPrice, plan.priceCurrency) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Yearly:</span>
                    <span class="text-sm font-medium">{{ formatPrice(plan.yearlyPrice, plan.priceCurrency) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Currency:</span>
                    <span class="text-sm font-medium">{{ plan.priceCurrency }}</span>
                  </div>
                </div>
              </div>

              <!-- Stripe Integration -->
              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">Stripe Integration</h4>
                <div class="space-y-1">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Product ID:</span>
                    <span class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {{ plan.stripeProductId || 'N/A' }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Monthly Price ID:</span>
                    <span class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {{ plan.stripeMonthlyPriceId || 'N/A' }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Yearly Price ID:</span>
                    <span class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {{ plan.stripeYearlyPriceId || 'N/A' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Raw Data -->
            <UAccordion :items="[{
              label: `View Raw Data for ${plan.name}`,
              icon: 'i-lucide-code-2'
            }]">
              <template #content>
                <div class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                  <pre class="text-xs">{{ JSON.stringify(plan, null, 2) }}</pre>
                </div>
              </template>
            </UAccordion>
          </div>
        </UCard>
      </div>

      <!-- Empty State -->
      <UCard v-if="!hasPlans && !loading && !error">
        <div class="text-center py-12">
          <Icon name="i-lucide-package-x" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-gray-900 mb-2">No Subscription Plans Found</h3>
          <p class="text-gray-600 mb-6">There are no subscription plans in the database yet.</p>
          <div class="space-y-2">
            <p class="text-sm text-gray-500">To add plans, run the seeding script:</p>
            <code class="block text-sm bg-gray-100 p-2 rounded font-mono">
              pnpm tsx scripts/billing-seed-plans.ts
            </code>
          </div>
        </div>
      </UCard>

      <!-- Debug Actions -->
      <UCard v-if="!loading">
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="i-lucide-terminal" class="w-5 h-5" />
            <h3 class="font-semibold">Debug Actions</h3>
          </div>
        </template>

        <div class="flex flex-wrap gap-3">
          <UButton
            @click="fetchPlans"
            :loading="loading"
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-refresh-cw"
          >
            Refresh Plans
          </UButton>

          <UButton
            to="/api/billing/plans"
            target="_blank"
            color="neutral"
            variant="solid"
            size="sm"
            icon="i-lucide-external-link"
          >
            View API Response
          </UButton>

          <UButton
            @click="console.log('Plans data:', plans)"
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-bug"
          >
            Log to Console
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
