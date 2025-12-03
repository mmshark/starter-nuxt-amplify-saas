<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <div class="w-full max-w-md">
      <!-- Branding -->
      <div v-if="config.layouts.auth.showBranding" class="text-center mb-8">
        <img
          :src="config.brand.logo"
          :alt="config.brand.name"
          class="h-12 mx-auto mb-4"
        />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ config.brand.name }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ config.brand.description }}
        </p>
      </div>

      <!-- Content Card -->
      <UCard>
        <slot />
      </UCard>

      <!-- Footer -->
      <div v-if="config.layouts.auth.showFooter" class="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
        <NuxtLink to="/privacy" class="hover:text-gray-900 dark:hover:text-white">
          Privacy
        </NuxtLink>
        <span class="mx-2">·</span>
        <NuxtLink to="/terms" class="hover:text-gray-900 dark:hover:text-white">
          Terms
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useSaasConfig()

// Redirect if already authenticated
definePageMeta({
  middleware: ['guest']
})
</script>
