<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

const { userAttributes, updateAttributes } = useUser()
const toast = useToast()

interface AccountForm {
  email: string
}

const state = ref<AccountForm>({
  email: userAttributes.value?.email || ''
})

// Watch for user changes
watch(userAttributes, (newAttributes) => {
  if (newAttributes?.email) {
    state.value.email = newAttributes.email
  }
}, { immediate: true })

const isLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<AccountForm>) {
  isLoading.value = true

  try {
    await updateAttributes({
      userAttributes: {
        email: event.data.email
      }
    })

    toast.add({
      title: 'Account updated',
      description: 'Your account settings have been saved.',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Update failed',
      description: error.message || 'Failed to update account settings.',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UForm :state="state" class="space-y-6" @submit="onSubmit">
    <UFormField label="Email Address" name="email" required>
      <UInput
        v-model="state.email"
        type="email"
        placeholder="you@example.com"
        :disabled="isLoading"
      />
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
