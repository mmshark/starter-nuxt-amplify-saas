<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

useSeoMeta({
  title: 'Sign Up'
})

const route = useRoute()
const state = ref('signup')

const onStateChange = (newState: string) => {
  state.value = newState
}

const onSignedIn = () => {
  const redirectTo = getRedirectUrl(route.query)
  navigateTo(redirectTo)
}
</script>

<template>
  <Authenticator
    :state="state"
    @state-change="onStateChange"
    @signed-in="onSignedIn"
  />
</template>
