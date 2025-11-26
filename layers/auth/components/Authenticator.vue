<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

defineOptions({
  name: 'Authenticator'
})

const props = defineProps({
  providers: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  signInFields: {
    type: Array,
    default: () => [
      {
        name: 'email',
        type: 'text',
        label: 'Email',
        placeholder: 'Enter your email',
        required: true
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Enter your password',
        required: true
      },
      {
        name: 'remember',
        label: 'Remember me',
        type: 'checkbox'
      }
    ]
  },
  signUpFields: {
    type: Array,
    default: () => [
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
        type: 'text',
        label: 'Email',
        placeholder: 'Enter your email',
        required: true
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Enter your password',
        required: true
      }
    ]
  },
  verifyFields: {
    type: Array,
    default: () => [
      {
        name: 'code',
        type: 'text',
        label: 'Verification Code',
        placeholder: 'Enter the code sent to your email',
        required: true
      }
    ]
  },
  state: {
    type: String,
    default: 'signin',
    validator: (value: string) => ['signin', 'signup', 'verify'].includes(value)
  }
})

const emit = defineEmits(['signedIn', 'stateChange'])

const currentStep = computed({
  get: () => props.state,
  set: value => emit('stateChange', value)
})

const loading = ref(false)
const resendLoading = ref(false)
const userEmail = ref('')
const toast = useToast()

// Schemas
const signInSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be 50 characters or less'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be 50 characters or less'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

const verifySchema = z.object({
  code: z.string().min(6, 'Verification code is required')
})

async function onSignInSubmit(event: FormSubmitEvent<z.infer<typeof signInSchema>>) {
  // Capture useNuxtApp before async operations
  const { Auth } = useNuxtApp().$Amplify

  loading.value = true
  try {
    const { isSignedIn, nextStep } = await Auth.signIn({
      username: event.data.email,
      password: event.data.password
    })

    if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
      userEmail.value = event.data.email
      currentStep.value = 'verify'
      return
    }

    if (isSignedIn) {
      toast.add({
        title: 'Success',
        description: 'Logged in successfully',
        color: 'green'
      })
      emit('signedIn')
    } else {
      toast.add({
        title: 'Error',
        description: 'Failed to login',
        color: 'red'
      })
    }
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to sign in',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

async function onSignUpSubmit(event: FormSubmitEvent<z.infer<typeof signUpSchema>>) {
  // Capture useNuxtApp before async operations
  const { Auth } = useNuxtApp().$Amplify

  loading.value = true
  try {
    console.log('onSignUpSubmit', event.data.email, event.data.password, event.data.firstName, event.data.lastName)
    const { isSignUpComplete, nextStep } = await Auth.signUp({
      username: event.data.email,
      password: event.data.password,
      options: {
        userAttributes: {
          'given_name': event.data.firstName,
          'family_name': event.data.lastName
        }
      }
    })

    if (!isSignUpComplete && nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
      userEmail.value = event.data.email
      currentStep.value = 'verify'
      toast.add({
        title: 'Verification Required',
        description: 'Please check your email for the verification code',
        color: 'blue'
      })
    }
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to create account',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

async function onVerifySubmit(event: FormSubmitEvent<z.infer<typeof verifySchema>>) {
  // Capture useNuxtApp before async operations
  const { Auth } = useNuxtApp().$Amplify

  loading.value = true
  try {
    await Auth.confirmSignUp({
      username: userEmail.value,
      confirmationCode: event.data.code
    })
    toast.add({
      title: 'Success',
      description: 'Account verified successfully',
      color: 'green'
    })
    currentStep.value = 'signin'
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to verify account',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

async function resendCode() {
  // Capture useNuxtApp before async operations
  const { Auth } = useNuxtApp().$Amplify

  resendLoading.value = true
  try {
    await Auth.resendSignUpCode({ username: userEmail.value })
    toast.add({
      title: 'Success',
      description: 'Verification code resent successfully',
      color: 'green'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to resend code',
      color: 'red'
    })
  } finally {
    resendLoading.value = false
  }
}
</script>

<template>
  <UAuthForm
    v-if="currentStep === 'signin'"
    :fields="signInFields"
    :schema="signInSchema"
    :providers="providers"
    title="Welcome back"
    icon="i-lucide-lock"
    :submit="{ label: 'Sign in', loading }"
    @submit="onSignInSubmit"
  >
    <template #description>
      Don't have an account? <ULink
        class="text-primary-500 font-medium"
        @click="currentStep = 'signup'"
      >Sign up</ULink>.
    </template>

    <template #password-hint>
      <ULink
        to="/auth/forgot-password"
        class="text-primary-500 font-medium"
      >Forgot password?</ULink>
    </template>

    <template #footer>
      By signing in, you agree to our <ULink
        to="/"
        class="text-primary-500 font-medium"
      >Terms of Service</ULink>.
    </template>
  </UAuthForm>

  <UAuthForm
    v-else-if="currentStep === 'signup'"
    :fields="signUpFields"
    :schema="signUpSchema"
    :providers="providers"
    title="Create an account"
    :submit="{ label: 'Create account', loading }"
    @submit="onSignUpSubmit"
  >
    <template #description>
      Already have an account? <ULink
        class="text-primary-500 font-medium"
        @click="currentStep = 'signin'"
      >Login</ULink>.
    </template>

    <template #footer>
      By signing up, you agree to our <ULink
        to="/"
        class="text-primary-500 font-medium"
      >Terms of Service</ULink>.
    </template>
  </UAuthForm>

  <UAuthForm
    v-else
    :fields="verifyFields"
    :schema="verifySchema"
    title="Verify your email"
    :submit="{ label: 'Verify Account', loading }"
    @submit="onVerifySubmit"
  >
    <template #description>
      Please enter the verification code sent to {{ userEmail }}
    </template>
    <template #footer>
      <div class="text-center">
        <UButton
          variant="ghost"
          :loading="resendLoading"
          @click="resendCode"
        >
          Resend verification code
        </UButton>
      </div>
    </template>
  </UAuthForm>
</template>
