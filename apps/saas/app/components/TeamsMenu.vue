<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { workspaces, currentWorkspace, switchWorkspace, loadWorkspaces } = useWorkspaces()
const showCreateModal = ref(false)

// Load workspaces on mount
onMounted(() => {
  loadWorkspaces()
})

const items = computed<DropdownMenuItem[][]>(() => {
  return [
    // Workspace list
    workspaces.value.map(workspace => ({
      label: workspace.name,
      avatar: {
        src: `https://ui-avatars.com/api/?name=${encodeURIComponent(workspace.name)}&background=random`,
        alt: workspace.name
      },
      onSelect() {
        switchWorkspace(workspace.id)
      }
    })),
    // Actions
    [{
      label: 'Create workspace',
      icon: 'i-lucide-circle-plus',
      onSelect() {
        showCreateModal.value = true
      }
    }, {
      label: 'Manage workspaces',
      icon: 'i-lucide-cog',
      to: '/settings/workspaces'
    }]
  ]
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        label: collapsed ? undefined : currentWorkspace?.name,
        avatar: currentWorkspace ? {
          src: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentWorkspace.name)}&background=random`,
          alt: currentWorkspace.name
        } : undefined,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>

  <!-- Create Workspace Modal -->
  <CreateWorkspaceModal v-model="showCreateModal" />
</template>
