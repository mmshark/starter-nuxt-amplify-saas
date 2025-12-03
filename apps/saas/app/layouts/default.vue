<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()
const appConfig = useAppConfig()

const open = ref(false)

const addOnSelectToMenuItem = (item: NavigationMenuItem): NavigationMenuItem => ({
  ...item,
  onSelect: () => {
    open.value = false
  },
  children: item.children?.map(addOnSelectToMenuItem)
})

const mainLinks = computed(() =>
  appConfig.saas?.navigation?.sidebar?.main?.map(group =>
    group.map(addOnSelectToMenuItem)
  ) as NavigationMenuItem[][] ?? [[]]
)

const footerLinks = computed(() =>
  appConfig.saas?.navigation?.sidebar?.footer?.map(group =>
    group.map(addOnSelectToMenuItem)
  ) as NavigationMenuItem[][] ?? [[]]
)

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: [...mainLinks.value.flat(), ...footerLinks.value.flat()]
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: 'i-simple-icons-github',
    to: `https://github.com/nuxt-ui-pro/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <WorkspaceSwitcher :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainLinks[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerLinks[0]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
