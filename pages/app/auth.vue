<script setup>
import { Authenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";

import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

definePageMeta({
  layout: 'app-auth'
});

Amplify.configure(outputs);

const route = useRoute();
const router = useRouter();
const redirect = route.query.redirect || '/app';

const validStates = ['signIn', 'signUp', 'forgotPassword', ''];
const initialState = validStates.find(
  state => state.toLowerCase() === (route.query.s || 'signIn').toLowerCase()
) || 'signIn';
</script>

<template>
  <authenticator :initial-state="initialState" :social-providers="['amazon', 'apple', 'facebook', 'google']">
    <template v-slot="{ user }">
      <div v-if="user" v-once hidden>
        {{ router.push(redirect) }}
      </div>
    </template>
  </authenticator>
</template>