<template>
  <div class="p-6">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-6 max-w-3xl">
        <div class="p-6 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700">
          <div class="flex items-center gap-4 mb-6">
            <Avatar
              :label="avatarInitials"
              size="xlarge" 
              shape="circle"
            />
            <div>
              <h2 class="text-lg font-medium text-surface-900 dark:text-surface-0">{{ showName }}</h2>
              <p class="text-surface-500">Update your photo and personal details</p>
            </div>
          </div>

          <form @submit.prevent="updateProfile" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">Email</label>
              <InputText v-model="showEmail" disabled />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">First Name</label>
              <InputText v-model="firstName" placeholder="Enter your first name" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">Last Name</label>
              <InputText v-model="lastName" placeholder="Enter your last name" />
            </div>

            <Button type="submit" label="Save Changes" class="w-fit mt-4" />
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth'

definePageMeta({
  middleware: ['authenticated'],
  layout: 'app'
})

const firstName = ref('')
const lastName = ref('')
const showName = ref('')
const showEmail = ref('')

const avatarInitials = computed(() => {
  if (showName.value && showName.value !== showEmail.value) {
    return showName.value
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }
  return showEmail.value ? showEmail.value[0].toUpperCase() : ''
})

onMounted(async () => {
  try {
    const { email, given_name, family_name } = await fetchUserAttributes()
    firstName.value = given_name || ''
    lastName.value = family_name || ''
    showName.value = (given_name || family_name) ? `${given_name || ''} ${family_name || ''}`.trim() : email
    showEmail.value = email
  } catch (error) {
    console.error('Error fetching user info:', error)
  }
})

async function updateProfile() {
  try {
    await updateUserAttributes({
      userAttributes: {
        given_name: firstName.value,
        family_name: lastName.value
      }
    })
    showName.value = `${firstName.value} ${lastName.value}`.trim()
  } catch (error) {
    console.error('Error updating profile:', error)
  }
}
</script>
