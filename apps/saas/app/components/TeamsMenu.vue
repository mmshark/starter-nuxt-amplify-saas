<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { workspaces, currentWorkspace, switchWorkspace, loadWorkspaces } = useWorkspaces()
const { user } = useUser()
const showCreateModal = ref(false)

// Load workspaces when user is authenticated
const loaded = ref(false)
watchEffect(() => {
  if (user?.value && !loaded.value) {
    loadWorkspaces()
    loaded.value = true
  }
})

// Debug logs
watchEffect(() => {
  console.log('Workspaces:', workspaces.value)
  console.log('Current workspace:', currentWorkspace.value)
})

const items = computed<DropdownMenuItem[][]>(() => {
  const workspaceItems = workspaces.value.map(workspace => ({
    label: workspace.name,
    avatar: {
      alt: workspace.name,
      size: 'xs' as const
    },
    onSelect() {
      console.log('Switching workspace:', workspace.id)
      switchWorkspace(workspace.id)
    }
  }))

  const actionItems = [{
    label: 'Create workspace',
    icon: 'i-lucide-circle-plus',
    onSelect() {
      console.log('Opening create modal')
      showCreateModal.value = true
    }
  }, {
    label: 'Workspace settings',
    icon: 'i-lucide-cog',
    to: '/settings/workspace'
  }]

  // Always include action items, add workspace items only if they exist
  return workspaceItems.length > 0
    ? [workspaceItems, actionItems]
    : [actionItems]
})
</script>

<template>
  <div>
    <UDropdownMenu
      :items="items"
      :content="{ align: 'center', collisionPadding: 12 }"
      :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
    >
      <UButton
        v-bind="{
          label: collapsed ? undefined : currentWorkspace?.name || 'Select Workspace',
          avatar: currentWorkspace ? { alt: currentWorkspace.name, size: 'xs' } : undefined,
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

    <CreateWorkspaceModal v-model="showCreateModal" />
  </div>
</template>
