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

const { resetPassword, confirmResetPassword } = useUser()
const toast = useToast()

const step = ref<'email' | 'confirm'>('email')
const loading = ref(false)
const userEmail = ref('')

// Email step schema and fields
const emailSchema = z.object({
  email: z.string().email('Invalid email address')
})

const emailFields = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email address',
    required: true
  }
]

// Confirm step schema and fields
const confirmSchema = z.object({
  code: z.string().min(6, 'Verification code is required'),
  password: z.string().min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Must be at least 8 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

const confirmFields = [
  {
    name: 'code',
    type: 'text',
    label: 'Verification Code',
    placeholder: 'Enter the code sent to your email',
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: 'New Password',
    placeholder: 'Enter your new password',
    required: true
  },
  {
    name: 'confirmPassword',
    type: 'password',
    label: 'Confirm New Password',
    placeholder: 'Confirm your new password',
    required: true
  }
]

async function onEmailSubmit(event: FormSubmitEvent<z.infer<typeof emailSchema>>) {
  loading.value = true
  try {
    const result = await resetPassword(event.data.email)

    if (result.success) {
      userEmail.value = event.data.email
      step.value = 'confirm'
      toast.add({
        title: 'Code Sent',
        description: 'Please check your email for the verification code',
        color: 'success'
      })
    } else {
      toast.add({
        title: 'Error',
        description: result.error || 'Failed to send reset code',
        color: 'error'
      })
    }
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to send reset code',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function onConfirmSubmit(event: FormSubmitEvent<z.infer<typeof confirmSchema>>) {
  loading.value = true
  try {
    const result = await confirmResetPassword(
      userEmail.value,
      event.data.code,
      event.data.password
    )

    if (result.success) {
      toast.add({
        title: 'Success',
        description: 'Your password has been reset successfully',
        color: 'success'
      })
      // Redirect to login page
      await navigateTo('/auth/login')
    } else {
      toast.add({
        title: 'Error',
        description: result.error || 'Failed to reset password',
        color: 'error'
      })
    }
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to reset password',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function goBackToEmail() {
  step.value = 'email'
}
</script>

<template>
  <!-- Email Step -->
  <UAuthForm
    v-if="step === 'email'"
    :fields="emailFields"
    :schema="emailSchema"
    title="Forgot your password?"
    icon="i-lucide-key"
    :submit="{ label: 'Send Reset Code', loading }"
    @submit="onEmailSubmit"
  >
    <template #description>
      Enter your email address and we'll send you a code to reset your password.
    </template>

    <template #footer>
      <div class="text-center">
        <ULink
          to="/auth/login"
          class="text-primary-500 font-medium"
        >
          Back to login
        </ULink>
      </div>
    </template>
  </UAuthForm>

  <!-- Confirm Step -->
  <UAuthForm
    v-else
    :fields="confirmFields"
    :schema="confirmSchema"
    title="Reset your password"
    icon="i-lucide-lock-keyhole"
    :submit="{ label: 'Reset Password', loading }"
    @submit="onConfirmSubmit"
  >
    <template #description>
      Please enter the verification code sent to {{ userEmail }} and choose a new password.
    </template>

    <template #password-hint>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.
      </div>
    </template>

    <template #footer>
      <div class="text-center space-y-2">
        <UButton
          variant="ghost"
          @click="goBackToEmail"
        >
          Use different email
        </UButton>
        <br>
        <ULink
          to="/auth/login"
          class="text-primary-500 font-medium"
        >
          Back to login
        </ULink>
      </div>
    </template>
  </UAuthForm>
</template>