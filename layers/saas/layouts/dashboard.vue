<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <AppHeader @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <div class="flex">
      <!-- Sidebar -->
      <AppSidebar
        :is-open="isSidebarOpen"
        :items="sidebarItems"
        @close="isSidebarOpen = false"
      />

      <!-- Main Content -->
      <main class="flex-1 p-6 max-w-7xl mx-auto w-full">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { settingsSidebar } from '../config/navigation'

// Enforce authentication
definePageMeta({
  middleware: ['auth']
})

// Sidebar state
const isSidebarOpen = ref(false)

// Load workspace context
const { currentWorkspace } = useWorkspace()
const { user } = useUser()

// Get app config
const appConfig = useAppConfig()

// Compose sidebar items: app items + settings from layer
const sidebarItems = computed<NavigationMenuItem[][]>(() => [
  ...(appConfig.saas?.navigation?.sidebarExtra || []),
  [settingsSidebar] // Settings menu from layer config
])

// Ensure user has workspace
onMounted(() => {
  if (!currentWorkspace.value) {
    console.warn('No workspace selected')
  }
})
</script>
