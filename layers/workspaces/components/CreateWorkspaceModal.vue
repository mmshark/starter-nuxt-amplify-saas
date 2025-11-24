<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          Create Workspace
        </h3>
      </template>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <UFormGroup label="Workspace Name" name="name" required>
          <UInput v-model="form.name" placeholder="My Awesome Team" />
        </UFormGroup>

        <UFormGroup label="Slug" name="slug" help="Unique identifier for your workspace URL">
          <UInput v-model="form.slug" placeholder="my-awesome-team" />
        </UFormGroup>

        <UFormGroup label="Description" name="description">
          <UTextarea v-model="form.description" placeholder="What is this workspace for?" />
        </UFormGroup>

        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="isOpen = false">
            Cancel
          </UButton>
          <UButton type="submit" :loading="loading" color="black">
            Create Workspace
          </UButton>
        </div>
      </form>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const { createWorkspace } = useWorkspaces()
const toast = useToast()
const loading = ref(false)
const form = reactive({
  name: '',
  slug: '',
  description: ''
})

const onSubmit = async () => {
  if (!form.name) return

  loading.value = true
  try {
    await createWorkspace({
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || undefined
    })
    isOpen.value = false
    form.name = ''
    form.slug = ''
    form.description = ''
    toast.add({ title: 'Workspace created successfully' })
  } catch (error) {
    console.error(error)
    toast.add({ title: 'Failed to create workspace', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
