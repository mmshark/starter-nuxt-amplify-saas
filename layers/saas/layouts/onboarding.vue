<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="text-center mb-8">
        <img
          :src="config.brand.logo"
          :alt="config.brand.name"
          class="h-12 mx-auto mb-4"
        />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome to {{ config.brand.name }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Let's get you set up
        </p>
      </div>

      <!-- Progress Bar -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Step {{ currentStep }} of {{ totalSteps }}
          </span>
          <NuxtLink
            to="/"
            class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Skip for now
          </NuxtLink>
        </div>
        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-600 transition-all duration-300"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          />
        </div>
      </div>

      <!-- Content -->
      <UCard>
        <slot />
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useSaasConfig()
const route = useRoute()

// Step tracking
const currentStep = computed(() => Number(route.query.step) || 1)
const totalSteps = computed(() => Number(route.query.total) || 3)

// Ensure authenticated
definePageMeta({
  middleware: ['auth']
})
</script>
