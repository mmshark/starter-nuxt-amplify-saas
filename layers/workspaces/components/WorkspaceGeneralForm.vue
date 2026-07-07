<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

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
  if (!workspace.value?.id) return

  isLoading.value = true

  try {
    await $fetch(`/api/workspaces/${workspace.value.id}`, {
      method: 'PUT',
      body: {
        name: event.data.name,
        description: event.data.description
      }
    })

    toast.add({
      title: 'Workspace updated',
      description: 'Your workspace settings have been saved.',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Update failed',
      description: error.data?.message || error.message || 'Failed to update workspace settings.',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UForm :state="state" class="space-y-6" @submit="onSubmit">
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
