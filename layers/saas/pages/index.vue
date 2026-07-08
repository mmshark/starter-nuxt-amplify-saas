<template>
  <UDashboardPanel id="home" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Home">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome, {{ userName }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ workspace?.name }} workspace
        </p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Subscription -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-zap" class="w-5 h-5 text-primary-500" />
              <h3 class="font-semibold">Subscription</h3>
            </div>
          </template>
          <p class="text-2xl font-bold">{{ subscriptionPlanName }}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Current plan</p>
          <template #footer>
            <UButton to="/settings/billing" variant="ghost" size="sm">
              Upgrade
            </UButton>
          </template>
        </UCard>

        <!-- Team Members -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="w-5 h-5 text-primary-500" />
              <h3 class="font-semibold">Team Members</h3>
            </div>
          </template>
          <p class="text-2xl font-bold">{{ memberCount }}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Active members</p>
          <template #footer>
            <UButton to="/settings/members" variant="ghost" size="sm">
              Manage
            </UButton>
          </template>
        </UCard>

        <!-- Workspace -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-building" class="w-5 h-5 text-primary-500" />
              <h3 class="font-semibold">Workspace</h3>
            </div>
          </template>
          <p class="text-2xl font-bold">{{ workspace?.name || 'N/A' }}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Current workspace</p>
          <template #footer>
            <UButton to="/settings/workspaces" variant="ghost" size="sm">
              Settings
            </UButton>
          </template>
        </UCard>
      </div>

      <!-- Quick Actions -->
      <div class="mt-8">
        <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UButton to="/settings/members" size="lg" block>
            <UIcon name="i-lucide-user-plus" class="mr-2" />
            Invite Team Members
          </UButton>
          <UButton to="/settings/billing" variant="outline" size="lg" block>
            <UIcon name="i-lucide-zap" class="mr-2" />
            Upgrade Plan
          </UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const { userAttributes, currentUser } = useUser()
const { workspace, workspaceId } = useWorkspace()
const { members } = useWorkspaceMembers(workspaceId)
const billing = useBilling()
const { subscription } = billing

onMounted(async () => {
  await billing.ensureInitialized()
})

const userName = computed(() =>
  userAttributes.value?.name ||
  currentUser.value?.username ||
  'there'
)

const subscriptionPlanName = computed(() =>
  subscription.value?.plan?.name || 'Free'
)

const memberCount = computed(() =>
  members.value?.length || 0
)
</script>
