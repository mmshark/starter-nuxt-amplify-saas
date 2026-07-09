<script setup lang="ts">
import type { NavigationMenuItem, CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'

const appConfig = useAppConfig()
const saasConfig = useSaasConfig()

// `appConfig.saas` is loosely typed here; narrow to the sidebar navigation
// shape we read below.
type SaasSidebarNav = { navigation?: { sidebar?: { main?: NavigationMenuItem[][]; footer?: NavigationMenuItem[][] } } }

const open = ref(false)

const addOnSelectToMenuItem = (item: NavigationMenuItem): NavigationMenuItem => ({
  ...item,
  onSelect: () => {
    open.value = false
  },
  children: item.children?.map(addOnSelectToMenuItem)
})

const mainLinks = computed(() =>
  (appConfig.saas as SaasSidebarNav)?.navigation?.sidebar?.main?.map(group =>
    group.map(addOnSelectToMenuItem)
  ) as NavigationMenuItem[][] ?? [[]]
)

const footerLinks = computed(() =>
  (appConfig.saas as SaasSidebarNav)?.navigation?.sidebar?.footer?.map(group =>
    group.map(addOnSelectToMenuItem)
  ) as NavigationMenuItem[][] ?? [[]]
)

// Narrow-cast to the command-palette group type expected by `UDashboardSearch`.
const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: [...mainLinks.value.flat(), ...footerLinks.value.flat()]
}] as CommandPaletteGroup<CommandPaletteItem>[])
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
        <WorkspaceSwitcher v-if="saasConfig.features?.workspaceSwitcher" :collapsed="collapsed" />
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
  </UDashboardGroup>
</template>
