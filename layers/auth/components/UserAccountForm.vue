<script setup lang="ts">
const { userAttributes } = useUser()

interface AccountForm {
  email: string
}

const state = ref<AccountForm>({
  email: userAttributes.value?.email || ''
})

// Keep the displayed email in sync with the loaded user attributes.
watch(userAttributes, (newAttributes) => {
  if (newAttributes?.email) {
    state.value.email = newAttributes.email
  }
}, { immediate: true })
</script>

<template>
  <UForm :state="state" class="space-y-6">
    <UFormField
      label="Email Address"
      name="email"
      description="Used for sign in and notifications."
    >
      <UInput
        v-model="state.email"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        readonly
        disabled
        class="bg-gray-50"
      />
    </UFormField>

    <!--
      Email editing is intentionally disabled: with `loginWith: email`, changing
      the address without a verification step would leave an unverified address
      as the login identifier. The verified change flow
      (sendUserAttributeVerificationCode / confirmUserAttribute) ships with
      account management (E07).
    -->
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Email changes require re-verification and aren't available here yet.
    </p>
  </UForm>
</template>
