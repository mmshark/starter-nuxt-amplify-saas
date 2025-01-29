<template>
  <div class="mb-6">
    <template v-if="selectedSubNav">
      <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">
        {{ selectedSubNav.title || selectedSubNav.label }}
      </h1>
      <p v-if="selectedSubNav.description" class="mt-1 text-surface-600 dark:text-surface-400">
        {{ selectedSubNav.description }}
      </p>
    </template>
    <h1 v-else class="text-2xl font-semibold text-surface-900 dark:text-surface-0">
      {{ selectedNav.label }}
    </h1>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedNav: {
    type: Object,
    required: true
  },
  selectedSubNav: {
    type: Object,
    default: null
  }
})
</script>
