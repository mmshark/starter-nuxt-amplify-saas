<template>
  <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between px-4 h-16">
      <!-- Left: Logo & Workspace Switcher -->
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Toggle -->
        <UButton
          icon="i-lucide-menu"
          variant="ghost"
          class="md:hidden"
          aria-label="Toggle sidebar"
          @click="$emit('toggle-sidebar')"
        />

        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2">
          <img :src="config.brand.logo" :alt="config.brand.name" class="h-8" />
          <span class="font-semibold text-lg hidden md:inline">{{ config.brand.name }}</span>
        </NuxtLink>

        <!-- Workspace Switcher -->
        <WorkspaceSwitcher v-if="config.features.workspaceSwitcher" />
      </div>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2">
        <!-- Dark Mode Toggle -->
        <UButton
          v-if="config.features.darkMode"
          :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
          variant="ghost"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleDarkMode"
        />

        <!-- User Menu -->
        <UserMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const config = useSaasConfig()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggleDarkMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

defineEmits<{
  'toggle-sidebar': []
}>()
</script>
