<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <AppHeader @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <div class="flex">
      <!-- Sidebar -->
      <AppSidebar
        :is-open="isSidebarOpen"
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
// Enforce authentication
definePageMeta({
  middleware: ['auth']
})

// Sidebar state
const isSidebarOpen = ref(false)

// Load workspace context
const { currentWorkspace } = useWorkspace()
const { user } = useUser()

// Ensure user has workspace
onMounted(() => {
  if (!currentWorkspace.value) {
    console.warn('No workspace selected')
  }
})
</script>
