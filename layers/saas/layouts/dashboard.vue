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

// NOTE: `definePageMeta` is a no-op when called from a layout — Nuxt only
// reads page meta declared on the page component itself. Auth protection
// for pages using this layout is enforced by `middleware: 'auth'` on each
// page (see pages/index.vue, pages/settings.vue, pages/profile.vue).

// Sidebar state
const isSidebarOpen = ref(false)

// Get app config
const appConfig = useAppConfig()

// Compose sidebar items: app items + settings from layer
const sidebarItems = computed<NavigationMenuItem[][]>(() => [
  // `appConfig.saas` is typed as `{}` here; narrow to the shape we read.
  ...((appConfig.saas as { navigation?: { sidebarExtra?: NavigationMenuItem[][] } })?.navigation?.sidebarExtra || []),
  [settingsSidebar] // Settings menu from layer config
])

</script>
