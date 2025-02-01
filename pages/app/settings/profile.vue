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
              <h2 class="text-lg font-medium text-surface-900 dark:text-surface-0">{{ fullName }}</h2>
              <p class="text-surface-500">Update your photo and personal details</p>
            </div>
          </div>

          <form @submit.prevent="updateProfile" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">Email</label>
              <InputText v-model="email" disabled />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">First Name</label>
              <InputText v-model="firstName" placeholder="Enter your first name" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">Last Name</label>
              <InputText v-model="lastName" placeholder="Enter your last name" />
            </div>

            <Button type="submit" label="Save Changes" class="w-fit mt-4" :loading="loading" />
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'app'
})

const {
  firstName,
  lastName,
  email,
  loading,
  fullName,
  avatarInitials,
  fetchUser,
  updateUser
} = useUser()

onMounted(async () => {
  await fetchUser()
})

async function updateProfile() {
  await updateUser({
    firstName: firstName.value,
    lastName: lastName.value
  })
}
</script>
