<template>
  <div class="relative flex gap-6 h-screen bg-surface-0 dark:bg-surface-950 p-6">
    <AppLayoutSidebar v-model:selectedNav="selectedNav" />

    <div class="flex-1 flex flex-col gap-6">
      <AppLayoutTopbar :selectedNav="selectedNav" />
      <div class="flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { sidebarNavs } from '~/saas.config'
const selectedNav = ref(sidebarNavs.topNavs[0])
</script>