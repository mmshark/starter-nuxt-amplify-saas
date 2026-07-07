<script setup lang="ts">
definePageMeta({
  layout: false
})

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

const {
  currentUser,
  userAttributes,
  isAuthenticated,
  loading: isLoading,
  error,
  updateAttributes
} = useUser()

const displayName = computed(() =>
  userAttributes.value?.name || currentUser.value?.username || ''
)
const email = computed(() => userAttributes.value?.email || '')

// Form state
const saving = ref(false)
const success = ref(false)
const errorMessage = ref('')

// Form data - initialize with current user attributes
const profileForm = reactive({
  displayName: '',
  firstName: '',
  lastName: ''
})

// Watch for user attributes changes and update form
watchEffect(() => {
  if (userAttributes.value) {
    profileForm.displayName = userAttributes.value['custom:display_name'] || ''
    profileForm.firstName = userAttributes.value['given_name'] || ''
    profileForm.lastName = userAttributes.value['family_name'] || ''
  }
})

// Handle form submission
const handleSubmit = async () => {
  if (!isAuthenticated.value) {
    errorMessage.value = 'You must be authenticated to update profile'
    return
  }

  saving.value = true
  success.value = false
  errorMessage.value = ''

  try {
    const attributes = {}
    
    // Only include non-empty values
    if (profileForm.displayName.trim()) {
      attributes['custom:display_name'] = profileForm.displayName.trim()
    }
    if (profileForm.firstName.trim()) {
      attributes['given_name'] = profileForm.firstName.trim()
    }
    if (profileForm.lastName.trim()) {
      attributes['family_name'] = profileForm.lastName.trim()
    }

    await updateAttributes({ userAttributes: attributes })

    success.value = true
    setTimeout(() => {
      success.value = false
    }, 3000)
  } catch (err) {
    errorMessage.value = err.message || 'An error occurred while updating profile'
  } finally {
    saving.value = false
  }
}

// Handle form reset
const handleReset = () => {
  if (userAttributes.value) {
    profileForm.displayName = userAttributes.value['custom:display_name'] || ''
    profileForm.firstName = userAttributes.value['given_name'] || ''
    profileForm.lastName = userAttributes.value['family_name'] || ''
  }
  errorMessage.value = ''
  success.value = false
}

</script>

<template>
  <div class="min-h-screen bg-gray-50 py-6">
    <div class="max-w-2xl mx-auto px-4">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="mb-4">
          <NuxtLink 
            to="/debug" 
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
          >
            <Icon name="i-lucide-arrow-left" class="w-4 h-4" />
            Back to Debug
          </NuxtLink>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Edit Profile</h1>
        <p class="text-gray-600">Update your profile information</p>
      </div>

      <!-- Authentication Check -->
      <div v-if="!isAuthenticated" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
        <Icon name="i-lucide-alert-triangle" class="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 class="text-lg font-medium text-red-900 mb-2">Not Authenticated</h3>
        <p class="text-red-700 mb-4">You need to be logged in to edit your profile.</p>
        <UButton to="/auth/login" color="error">Go to Login</UButton>
      </div>

      <!-- Profile Form -->
      <div v-else>
        <!-- Success/Error Messages -->
        <div v-if="success" class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
          <Icon name="i-lucide-check-circle" class="w-6 h-6 mx-auto text-green-500 mb-2" />
          <p class="text-green-800 font-medium">Profile updated successfully!</p>
        </div>

        <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center">
          <Icon name="i-lucide-x-circle" class="w-6 h-6 mx-auto text-red-500 mb-2" />
          <p class="text-red-800 font-medium">{{ errorMessage }}</p>
        </div>

        <!-- Form Card -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <Icon name="i-lucide-user-pen" class="w-5 h-5" />
              <h3 class="font-semibold">Edit Profile</h3>
            </div>
          </template>
          
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div class="space-y-4">
              <!-- Display Name -->
              <div>
                <label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  id="displayName"
                  v-model="profileForm.displayName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your display name"
                  maxlength="50"
                />
              </div>

              <!-- First Name -->
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  v-model="profileForm.firstName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your first name"
                  maxlength="50"
                />
              </div>

              <!-- Last Name -->
              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  v-model="profileForm.lastName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your last name"
                  maxlength="50"
                />
              </div>

            </div>

            <!-- Form Actions -->
            <div class="flex gap-3 pt-4">
              <UButton
                type="submit"
                :disabled="saving || isLoading"
                :loading="saving"
                color="primary"
              >
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </UButton>

              <UButton
                type="button"
                @click="handleReset"
                :disabled="saving"
                color="primary"
                variant="soft"
              >
                Reset
              </UButton>
            </div>
          </form>
        </UCard>
      </div>
    </div>
  </div>
</template>