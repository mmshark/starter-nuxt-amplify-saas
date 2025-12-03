<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { settingsSidebar } from '@starter-nuxt-amplify-saas/saas/config/navigation'

definePageMeta({ middleware: 'auth' })

// Extract title and links from navigation config
const title = computed(() => settingsSidebar.label || 'Settings')
const links = computed(() => [settingsSidebar.children || []] as NavigationMenuItem[][])
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
