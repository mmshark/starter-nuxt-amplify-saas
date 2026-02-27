<script setup lang="ts">
definePageMeta({
  layout: false
})

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

// State
const users = ref([])
const loading = ref(false)
const error = ref('')

// Fetch users using the debug API
const fetchUsers = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/debug/users')

    if (!response.success) {
      throw new Error('Failed to fetch users')
    }

    users.value = response.data.users || []
  } catch (err) {
    console.error('Error fetching users:', err)
    error.value = err.message || 'Unknown error occurred'
  } finally {
    loading.value = false
  }
}

// Load users on mount
onMounted(() => {
  fetchUsers()
})

// Computed
const hasUsers = computed(() => users.value.length > 0)
const usersWithSubscriptions = computed(() => users.value.filter(user => user.subscription))
const usersWithoutSubscriptions = computed(() => users.value.filter(user => !user.subscription))

// Format dates
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get subscription status color
const getSubscriptionStatus = (subscription: any) => {
  if (!subscription) return { color: 'gray', label: 'No Subscription' }

  const statusMap = {
    'active': { color: 'green', label: 'Active' },
    'past_due': { color: 'yellow', label: 'Past Due' },
    'canceled': { color: 'red', label: 'Canceled' },
    'trialing': { color: 'blue', label: 'Trialing' },
    'incomplete': { color: 'orange', label: 'Incomplete' },
    'incomplete_expired': { color: 'red', label: 'Expired' },
    'unpaid': { color: 'red', label: 'Unpaid' }
  }

  return statusMap[subscription.status] || { color: 'gray', label: subscription.status }
}

// Get plan badge color
const getPlanBadgeColor = (planId: string) => {
  const planColors = {
    'free': 'gray',
    'starter': 'blue',
    'pro': 'green',
    'enterprise': 'purple'
  }
  return planColors[planId] || 'gray'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Page header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Users Debug</h1>
        <p class="text-gray-600">View all user profiles and their subscriptions</p>
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
          <span class="text-gray-600">Loading users...</span>
        </div>
      </div>

      <!-- Error State -->
      <UAlert
        v-if="error && !loading"
        color="red"
        variant="soft"
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <!-- Users Summary -->
      <UCard v-if="hasUsers && !loading">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="i-lucide-users" class="w-5 h-5" />
              <h3 class="font-semibold">Users Summary</h3>
            </div>
            <UButton
              @click="fetchUsers"
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
            <div class="text-2xl font-bold text-blue-600">{{ users.length }}</div>
            <div class="text-sm text-blue-800">Total Users</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ usersWithSubscriptions.length }}</div>
            <div class="text-sm text-green-800">With Subscriptions</div>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-2xl font-bold text-gray-600">{{ usersWithoutSubscriptions.length }}</div>
            <div class="text-sm text-gray-800">Without Subscriptions</div>
          </div>
          <div class="text-center p-4 bg-purple-50 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">{{ users.filter(u => u.subscription?.planId === 'free').length }}</div>
            <div class="text-sm text-purple-800">Free Plan Users</div>
          </div>
        </div>
      </UCard>

      <!-- Users List -->
      <div v-if="hasUsers && !loading" class="space-y-4">
        <UCard
          v-for="user in users"
          :key="user.userId"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <Icon
                  name="i-lucide-user"
                  class="w-6 h-6 text-gray-500"
                />
                <div>
                  <h3 class="font-semibold text-lg">{{ user.userId }}</h3>
                  <p class="text-sm text-gray-600">
                    Stripe Customer: {{ user.stripeCustomerId || 'Not set' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  v-if="user.subscription"
                  :color="getSubscriptionStatus(user.subscription).color"
                  variant="soft"
                >
                  {{ getSubscriptionStatus(user.subscription).label }}
                </UBadge>
                <UBadge
                  v-else
                  color="gray"
                  variant="soft"
                >
                  No Subscription
                </UBadge>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Subscription Info -->
            <div v-if="user.subscription" class="space-y-3">
              <h4 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">Subscription Details</h4>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Plan:</span>
                    <UBadge
                      :color="getPlanBadgeColor(user.subscription.planId)"
                      variant="soft"
                      size="sm"
                    >
                      {{ user.subscription.planId }}
                    </UBadge>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Billing Interval:</span>
                    <span class="text-sm font-medium">{{ user.subscription.billingInterval || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Cancel at Period End:</span>
                    <span class="text-sm font-medium">{{ user.subscription.cancelAtPeriodEnd ? 'Yes' : 'No' }}</span>
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Current Period Start:</span>
                    <span class="text-sm font-medium">{{ formatDate(user.subscription.currentPeriodStart) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Current Period End:</span>
                    <span class="text-sm font-medium">{{ formatDate(user.subscription.currentPeriodEnd) }}</span>
                  </div>
                  <div v-if="user.subscription.trialStart" class="flex justify-between">
                    <span class="text-sm text-gray-600">Trial Period:</span>
                    <span class="text-sm font-medium">
                      {{ formatDate(user.subscription.trialStart) }} - {{ formatDate(user.subscription.trialEnd) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- No Subscription Message -->
            <div v-else class="text-center py-4 bg-gray-50 rounded-lg">
              <Icon name="i-lucide-user-x" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p class="text-sm text-gray-600">This user has no active subscription</p>
            </div>

            <!-- Raw Data -->
            <UAccordion :items="[{
              label: `View Raw Data for ${user.userId}`,
              icon: 'i-lucide-code-2'
            }]">
              <template #content>
                <div class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                  <pre class="text-xs">{{ JSON.stringify(user, null, 2) }}</pre>
                </div>
              </template>
            </UAccordion>
          </div>
        </UCard>
      </div>

      <!-- Empty State -->
      <UCard v-if="!hasUsers && !loading && !error">
        <div class="text-center py-12">
          <Icon name="i-lucide-users" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
          <p class="text-gray-600 mb-6">There are no user profiles in the database yet.</p>
          <div class="space-y-2">
            <p class="text-sm text-gray-500">To add users, run the seeding script:</p>
            <code class="block text-sm bg-gray-100 p-2 rounded font-mono">
              pnpm backend:sandbox:seed:users
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
            @click="fetchUsers"
            :loading="loading"
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-refresh-cw"
          >
            Refresh Users
          </UButton>

          <UButton
            to="/api/debug/users"
            target="_blank"
            color="gray"
            variant="solid"
            size="sm"
            icon="i-lucide-external-link"
          >
            View API Response
          </UButton>

          <UButton
            @click="console.log('Users data:', users)"
            color="gray"
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
