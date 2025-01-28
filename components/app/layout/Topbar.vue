<template>
  <div
    class="flex sm:items-center flex-wrap sm:flex-row flex-col lg:px-5 pt-3 pb-4 justify-between border-b border-surface gap-4"
  >
    <div class="flex items-center gap-2">
      <!-- Sidebar toggle icon (for mobile) -->
      <a
        v-styleclass="{
          selector: '#app-sidebar-14',
          enterFromClass: 'hidden',
          enterActiveClass: 'animate-fadeinleft',
          leaveToClass: 'hidden',
          leaveActiveClass: 'animate-fadeoutleft',
          hideOnOutsideClick: true
        }"
        class="cursor-pointer block lg:hidden text-surface-700 dark:text-surface-100 mr-2"
      >
        <i class="pi pi-bars text-3xl" />
      </a>
      <div class="flex-1">
        <h1 class="text-lg font-medium text-surface-900 dark:text-surface-0">
          {{ selectedNav.label }}
        </h1>
        <p class="text-surface-500">Description</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search" />
      </IconField>
      <Button icon="pi pi-bell" outlined severity="secondary" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  selectedNav: {
    type: Object,
    required: true
  }
})

const search = ref('')
</script>