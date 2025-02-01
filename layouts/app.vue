<template>
  <authenticator
    :initial-state="initialState"
    :social-providers="['amazon', 'apple', 'facebook', 'google']"
  >
    <template v-slot="{ user }">
      <div class="relative flex gap-6 h-screen bg-surface-0 dark:bg-surface-950 p-6">
        <AppLayoutSidebar 
          v-model:selectedNav="selectedNav"
          v-model:selectedSubNav="selectedSubNav" 
        />

        <div class="flex-1 flex flex-col gap-6">
          <AppLayoutTopbar :selectedNav="selectedNav" />
          <div class="flex-1">
            <AppLayoutPageTitle :selectedNav="selectedNav" :selectedSubNav="selectedSubNav" />
            <slot />
          </div>
        </div>
      </div>
    </template>
  </authenticator>
</template>

<script setup>
import { Authenticator } from "@aws-amplify/ui-vue";
import { sidebarNavs } from '~/saas.config'
const selectedNav = ref(sidebarNavs.topNavs[0])
const selectedSubNav = ref(sidebarNavs.topNavs[0].subMenu?.[0] || null)
</script>