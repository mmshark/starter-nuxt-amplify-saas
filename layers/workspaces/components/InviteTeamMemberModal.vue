<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          Invite Team Member
        </h3>
      </template>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <UFormGroup label="Email Address" name="email" required>
          <UInput v-model="form.email" type="email" placeholder="colleague@company.com" />
        </UFormGroup>

        <UFormGroup label="Role" name="role" required>
          <USelect v-model="form.role" :options="roleOptions" />
        </UFormGroup>

        <UFormGroup label="Message" name="message">
          <UTextarea v-model="form.message" placeholder="Join our team workspace..." />
        </UFormGroup>

        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="isOpen = false">
            Cancel
          </UButton>
          <UButton type="submit" :loading="loading" color="black">
            Send Invitation
          </UButton>
        </div>
      </form>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import type { WorkspaceRole } from '../types/workspaces'

const props = defineProps<{
  modelValue: boolean
  workspaceId: string
}>()

const emit = defineEmits(['update:modelValue', 'invited'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const { inviteMember } = useWorkspaceMembers(props.workspaceId)
const toast = useToast()
const loading = ref(false)

const form = reactive({
  email: '',
  role: 'MEMBER' as WorkspaceRole,
  message: ''
})

const roleOptions = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'ADMIN', label: 'Admin' }
]

const onSubmit = async () => {
  if (!form.email) return

  loading.value = true
  try {
    await inviteMember({
      email: form.email,
      role: form.role,
      message: form.message
    })
    isOpen.value = false
    form.email = ''
    form.message = ''
    form.role = 'MEMBER'
    emit('invited')
    toast.add({ title: 'Invitation sent successfully' })
  } catch (error) {
    console.error(error)
    toast.add({ title: 'Failed to send invitation', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
