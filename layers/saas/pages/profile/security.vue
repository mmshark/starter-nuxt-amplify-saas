<template>
  <UPageCard
    title="Password"
    description="Change your password from the sign-in reset flow."
    variant="subtle"
  >
    <!--
      In-app authenticated password change (updatePassword) is not implemented
      yet (E07). Rather than show a form that does nothing, point at the reset
      flow that actually works today. Note: /auth/forgot-password is guarded by
      the `guest` middleware, so it is only reachable while signed out — the copy
      says so to avoid a dead-end.
    -->
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Changing your password from inside the app isn't available yet. To set a
      new password, sign out and use the <strong>Forgot password</strong> link
      on the sign-in page.
    </p>

    <template #footer>
      <UButton
        to="/auth/forgot-password"
        label="Go to password reset"
        color="primary"
        variant="subtle"
      />
    </template>
  </UPageCard>
</template>
