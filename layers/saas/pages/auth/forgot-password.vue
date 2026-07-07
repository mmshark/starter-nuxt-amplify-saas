<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

useSeoMeta({
  title: 'Forgot Password'
})

const { resetPassword, confirmResetPassword, loading } = useUser()
const toast = useToast()

const step = ref<'request' | 'confirm'>('request')
const userEmail = ref('')

// Step 1: Request reset code
const requestSchema = z.object({
  email: z.string().email('Invalid email address')
})

// Step 2: Confirm reset with code + new password
const confirmSchema = z.object({
  code: z.string().min(6, 'Verification code is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
})

async function onRequestSubmit(event: FormSubmitEvent<z.infer<typeof requestSchema>>) {
  const result = await resetPassword(event.data.email)

  if (result.success) {
    userEmail.value = event.data.email
    step.value = 'confirm'
    toast.add({
      title: 'Code sent',
      description: 'Check your email for the reset code',
      color: 'info'
    })
  } else {
    toast.add({
      title: 'Error',
      description: result.error || 'Failed to send reset code',
      color: 'error'
    })
  }
}

async function onConfirmSubmit(event: FormSubmitEvent<z.infer<typeof confirmSchema>>) {
  const result = await confirmResetPassword(
    userEmail.value,
    event.data.code,
    event.data.newPassword
  )

  if (result.success) {
    toast.add({
      title: 'Password reset',
      description: 'Your password has been reset. Please sign in.',
      color: 'success'
    })
    navigateTo('/auth/login')
  } else {
    toast.add({
      title: 'Error',
      description: result.error || 'Failed to reset password',
      color: 'error'
    })
  }
}
</script>

<template>
  <!-- Step 1: Request code -->
  <UAuthForm
    v-if="step === 'request'"
    :fields="[
      { name: 'email', type: 'text', label: 'Email', placeholder: 'Enter your email', required: true }
    ]"
    :schema="requestSchema"
    title="Reset your password"
    icon="i-lucide-key-round"
    :submit="{ label: 'Send reset code', loading }"
    @submit="onRequestSubmit"
  >
    <template #description>
      Enter your email and we'll send you a code to reset your password.
    </template>
    <template #footer>
      <ULink to="/auth/login" class="text-primary-500 font-medium">
        Back to sign in
      </ULink>
    </template>
  </UAuthForm>

  <!-- Step 2: Enter code + new password -->
  <UAuthForm
    v-else
    :fields="[
      { name: 'code', type: 'text', label: 'Verification Code', placeholder: 'Enter the code', required: true },
      { name: 'newPassword', type: 'password', label: 'New Password', placeholder: 'Enter new password', required: true }
    ]"
    :schema="confirmSchema"
    title="Enter reset code"
    icon="i-lucide-shield-check"
    :submit="{ label: 'Reset password', loading }"
    @submit="onConfirmSubmit"
  >
    <template #description>
      Enter the code sent to {{ userEmail }} and your new password.
    </template>
    <template #footer>
      <UButton
        variant="ghost"
        @click="step = 'request'"
      >
        Use a different email
      </UButton>
    </template>
  </UAuthForm>
</template>
