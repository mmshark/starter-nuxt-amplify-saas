<template>
  <div 
    id="app-sidebar-14" 
    class="h-full hidden lg:block lg:static absolute left-0 top-0 py-4 pl-4 lg:p-0 z-50"
  >
    <div class="w-[18rem] h-full flex flex-col bg-surface-50 dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800">
      <!-- Logo -->
      <a class="inline-flex items-center gap-3 px-6 py-4 cursor-pointer">
        <svg
          class="fill-surface-900 dark:fill-surface-0"
          width="28"
          height="29"
          viewBox="0 0 28 29"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M14 28.5C21.732 28.5 28 22.232 28 14.5C28 6.76802 21.732 0.5 14 0.5C6.26801 0.5 0 6.76802 0 14.5C0 22.232 6.26801 28.5 14 28.5ZM18.3675 7.02179C18.5801 6.26664 17.8473 5.82009 17.178 6.29691L7.83519 12.9527C7.10936 13.4698 7.22353 14.5 8.00669 14.5H10.4669V14.4809H15.2618L11.3549 15.8595L9.63251 21.9782C9.41992 22.7334 10.1527 23.1799 10.822 22.7031L20.1649 16.0473C20.8907 15.5302 20.7764 14.5 19.9934 14.5H16.2625L18.3675 7.02179Z"
          />
        </svg>
        <span class="font-semibold text-surface-900 dark:text-surface-0">
          Starter Nuxt Amplify SaaS
        </span>
      </a>

      <!-- Divider -->
      <div class="w-[calc(100%-3rem)] mx-auto h-[1px] bg-surface-200 dark:bg-surface-700" />

      <!-- Navigation List -->
      <div class="p-6 flex-1">
        <ul class="flex flex-col gap-2 overflow-hidden">
          <template v-for="(item, index) in sidebarNavs.topNavs" :key="index">
            <AppLayoutSidebarItem
              :item="item"
              :isSelected="selectedNav.label === item.label"
              :selectedSubNav="selectedSubNav"
              @click-nav="handleClickNav(item)"
              @click-sub-nav="handleClickSubNav"
            />
          </template>
        </ul>
      </div>

      <!-- Bottom Navs -->
      <ul class="flex flex-col gap-2 px-6 py-3">
        <template v-for="(item, index) in sidebarNavs.bottomNavs" :key="index">
          <AppLayoutSidebarItem
            :item="item"
            :isSelected="selectedNav.label === item.label"
            :selectedSubNav="selectedSubNav"
            @click-nav="handleClickNav(item)"
            @click-sub-nav="handleClickSubNav"
          />
        </template>
      </ul>

      <!-- Divider -->
      <div class="w-[calc(100%-3rem)] mx-auto h-[1px] bg-surface-200 dark:bg-surface-700" />

      <!-- User info / Avatar -->
      <div class="p-6 flex items-center gap-3">
        <div class="flex items-center gap-3 flex-1 cursor-pointer">
          <Avatar
            image="https://fqjltiegiezfetthbags.supabase.co/storage/v1/render/image/public/block.images/blocks/avatars/circle/avatar-f-1.png"
            size="large"
            shape="circle"
            class="!w-9 !h-9"
          />
          <div>
            <div class="text-sm font-semibold text-surface-900 dark:text-surface-0">
              Amy Elsner
            </div>
            <span class="text-xs text-surface-600 dark:text-surface-400 leading-none">
              Description
            </span>
          </div>
        </div>
        <Button 
          icon="pi pi-sign-out"
          text
          rounded
          class="!p-2"
          severity="secondary"
          aria-label="Logout"
          @click="signOut"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import Avatar from 'primevue/avatar'
import { ref } from 'vue'
import { sidebarNavs } from '~/saas.config'

const props = defineProps({
  selectedNav: {
    type: Object,
    required: true,
    modelValue: true
  }
})

const selectedSubNav = ref(null)

function handleClickNav(item) {
  props.selectedNav.label = item.label
  if (item.link) {
    navigateTo(item.link)
  }
}

function handleClickSubNav(item) {
  selectedSubNav.value = item.label
  if (item.link) {
    navigateTo(item.link)
  }
}

import { Authenticator, useAuthenticator } from '@aws-amplify/ui-vue';
const auth = useAuthenticator();
const router = useRouter();

const signOut = async () => {
  await auth.signOut();
  router.push('/');
}
</script>