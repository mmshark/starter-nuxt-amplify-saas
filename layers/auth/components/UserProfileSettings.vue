<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

defineOptions({
  name: 'UserProfileSettings'
})

const { userAttributes, updateAttributes, loading } = useUser()
const toast = useToast()

// Form schema
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be 50 characters or less'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be 50 characters or less'),
  email: z.string().email('Invalid email')
})

type ProfileSchema = z.output<typeof profileSchema>

// Form fields configuration
const formFields = [
  {
    name: 'firstName',
    type: 'text',
    label: 'First Name',
    placeholder: 'Enter your first name',
    required: true
  },
  {
    name: 'lastName',
    type: 'text',
    label: 'Last Name',
    placeholder: 'Enter your last name',
    required: true
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Your email address',
    required: true,
    readonly: true,
    description: 'Email cannot be changed here'
  }
]

// Form state - reactive to current user attributes
const profileForm = computed(() => ({
  firstName: userAttributes.value?.given_name || '',
  lastName: userAttributes.value?.family_name || '',
  email: userAttributes.value?.email || ''
}))

// Handle form submission
async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  try {
    const attributes: Record<string, string> = {}

    // Only update attributes that have changed
    if (event.data.firstName !== userAttributes.value?.given_name) {
      attributes.given_name = event.data.firstName
    }
    if (event.data.lastName !== userAttributes.value?.family_name) {
      attributes.family_name = event.data.lastName
    }

    // If no changes, show info message
    if (Object.keys(attributes).length === 0) {
      toast.add({
        title: 'No changes',
        description: 'No changes were made to your profile',
        color: 'blue'
      })
      return
    }

    await updateAttributes(attributes)

    toast.add({
      title: 'Success',
      description: 'Your profile has been updated successfully',
      color: 'green'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to update profile',
      color: 'red'
    })
  }
}
</script>

<template>
  <UForm
    :schema="profileSchema"
    :state="profileForm"
    @submit="onSubmit"
  >
    <UPageCard
      title="Profile Information"
      description="Update your personal information"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Save changes"
        color="neutral"
        type="submit"
        :loading="loading"
        :disabled="loading"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="firstName"
        label="First Name"
        description="Your first name as it appears on official documents"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profileForm.firstName"
          type="text"
          placeholder="Enter your first name"
          autocomplete="given-name"
          :disabled="loading"
        />
      </UFormField>

      <USeparator />

      <UFormField
        name="lastName"
        label="Last Name"
        description="Your last name as it appears on official documents"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profileForm.lastName"
          type="text"
          placeholder="Enter your last name"
          autocomplete="family-name"
          :disabled="loading"
        />
      </UFormField>

      <USeparator />

      <UFormField
        name="email"
        label="Email"
        description="Your email address used for sign in and notifications"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profileForm.email"
          type="email"
          placeholder="Your email address"
          autocomplete="email"
          readonly
          disabled
          class="bg-gray-50"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>