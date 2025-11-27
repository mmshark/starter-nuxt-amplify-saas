<template>
  <div>
    <UDropdown :items="items" :popper="{ placement: 'bottom-start' }">
      <UButton
        color="white"
        variant="ghost"
        class="w-full justify-between"
        :label="currentWorkspace?.name || 'Select Workspace'"
      >
        <template #leading>
          <UAvatar
            :alt="currentWorkspace?.name"
            size="xs"
          />
        </template>
        <template #trailing>
          <UIcon name="i-heroicons-chevron-down-20-solid" />
        </template>
      </UButton>
    </UDropdown>

    <CreateWorkspaceModal v-model="showCreateModal" />
  </div>
</template>

<script setup lang="ts">
const { workspaces, currentWorkspace, switchWorkspace } = useWorkspaces()
const showCreateModal = ref(false)

const items = computed(() => [
  [
    {
      label: 'Workspaces',
      disabled: true
    },
    ...workspaces.value.map(w => ({
      label: w.name,
      avatar: {
        alt: w.name,
        size: 'xs'
      },
      click: () => switchWorkspace(w.id)
    }))
  ],
  [
    {
      label: 'Create Workspace',
      icon: 'i-heroicons-plus',
      click: () => {
        showCreateModal.value = true
      }
    }
  ]
])
</script>
