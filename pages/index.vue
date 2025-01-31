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
      <PlanVanilaCards :plans="plans"/>
    </div>
  </div>
</template>

<script setup>
import { getCurrentUser } from 'aws-amplify/auth';
import { usePlans } from '~/utils/usePlans';

const user = ref(null);
const { plans, error, fetchPlans } = usePlans();

onMounted(async () => {
  try {
    await fetchPlans({
      sortByIndex: true
    });
  } catch (error) {
    console.error("Error:", error);
  }
});
</script>

<style scoped>

</style>
