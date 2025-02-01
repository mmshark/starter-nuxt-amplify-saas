<template>
  <div>
    App Page
  </div>
  <div>
    <button @click="signOut">Sign Out</button>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'app'
})

import { Authenticator, useAuthenticator } from '@aws-amplify/ui-vue';
const auth = useAuthenticator();
const router = useRouter();

const signOut = async () => {
  await auth.signOut();
  router.push('/');
}
</script>

<style scoped>

</style>
