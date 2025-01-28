<template>
  <div class="container mx-auto px-4 py-8">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-4">Home Page</h1>
      <NuxtLink 
        to="/app"
        class="inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
      >
        Go to App
      </NuxtLink>
    </div>

    <div class="mb-8">
      <p>Plan Vanila Cards</p>
      <PlanVanilaCards price-switcher />
    </div>

    <div>
      <p>Plan Stripe Cards</p>
      <PlanStripeCards 
        pricing-table-id="prctbl_1QmE1UIOUVeEvI6sJki3lK0x"
        publishable-key="pk_test_51QmDrCIOUVeEvI6skZG6L0cGgLcoD8EJXKcMQL1ebLoX3jOu8FnSr5poK3Pkra8GgVbkijMiNk0DKI0p0kPEhXdm00RGd9HBDG"
        :customer-email="user?.signInDetails?.loginId"
        :client-reference-id="user?.userId">
      </PlanStripeCards>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { Amplify } from 'aws-amplify';
import { getCurrentUser } from 'aws-amplify/auth';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
const user = ref(null);

onMounted(async () => {
  try {
    user.value = await getCurrentUser();
    console.log("User:", user.value);
  } catch (error) {
    console.error("Error getting current user:", error);
  }
});
</script>

<style scoped>

</style>
