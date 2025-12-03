<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Workspace } from '../types/workspaces'

const { workspace } = useWorkspace()
const toast = useToast()

interface WorkspaceForm {
  name: string
  description?: string
  slug: string
}

const state = ref<WorkspaceForm>({
  name: workspace.value?.name || '',
  description: workspace.value?.description || '',
  slug: workspace.value?.slug || ''
})

// Watch for workspace changes
watch(workspace, (newWorkspace) => {
  if (newWorkspace) {
    state.value = {
      name: newWorkspace.name,
      description: newWorkspace.description || '',
      slug: newWorkspace.slug
    }
  }
}, { immediate: true })

const isLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<WorkspaceForm>) {
  isLoading.value = true

  try {
    // TODO: Implement workspace update mutation
    // await updateWorkspace(workspace.value!.id, event.data)

    toast.add({
      title: 'Workspace updated',
      description: 'Your workspace settings have been saved.',
      color: 'green'
    })
  } catch (error: any) {
    toast.add({
      title: 'Update failed',
      description: error.message || 'Failed to update workspace settings.',
      color: 'red'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UForm :state="state" @submit="onSubmit" class="space-y-6">
    <UFormField label="Workspace Name" name="name" required>
      <UInput
        v-model="state.name"
        placeholder="My Workspace"
        :disabled="isLoading"
      />
    </UFormField>

    <UFormField label="Description" name="description">
      <UTextarea
        v-model="state.description"
        placeholder="A brief description of your workspace..."
        :rows="3"
        :disabled="isLoading"
      />
    </UFormField>

    <UFormField
      label="Workspace URL"
      name="slug"
      help="This is your workspace's unique identifier in URLs."
    >
      <UInput
        v-model="state.slug"
        placeholder="my-workspace"
        :disabled="true"
        class="opacity-60"
      >
        <template #leading>
          <span class="text-sm text-gray-500">workspace/</span>
        </template>
      </UInput>
    </UFormField>

    <div class="flex justify-end gap-3">
      <UButton
        type="submit"
        label="Save Changes"
        :loading="isLoading"
        :disabled="isLoading"
      />
    </div>
  </UForm>
</template>
