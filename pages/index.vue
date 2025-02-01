<template>
  <div class="min-h-screen flex flex-col">

    <!-- ========== TOP NAVIGATION BAR ========== -->
    <Menubar :model="menuItems" class="border-b border-gray-200 shadow-sm" />

    <!-- ========== HERO SECTION ========== -->
    <div class="relative bg-gradient-to-b from-white via-primary-50 to-primary-100 text-primary-900">
      <div class="container mx-auto px-4 py-16">
        <div class="text-center max-w-3xl mx-auto">
          <h1 class="text-5xl font-bold mb-6">
            Build Faster with Our SaaS Starter
          </h1>
          <p class="text-xl mb-8 text-gray-600">
            Launch your SaaS project in minutes with our fully featured starter template, 
            built with <span class="text-primary-500 font-bold">Nuxt</span> and ready to deploy on <span class="text-primary-500 font-bold">AWS Amplify</span>. Authentication, billing, 
            and user management – all ready to go.
          </p>
          <div class="flex gap-4 justify-center">
            <Button label="Get Started" icon="pi pi-rocket" severity="success" size="large" />
            <Button label="Live Demo" icon="pi pi-play" outlined size="large" />
          </div>
        </div>
      </div>

      <!-- Wave Divider -->
      <div class="absolute -bottom-8 w-full h-[120px] overflow-hidden">
        <svg
          class="absolute bottom-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            fill="#ffffff"
            fill-opacity="1"
            d="M0,32L60,42.7C120,53,240,75,360,74.7C480,75,600,53,720,48C840,43,960,53,
               1080,58.7C1200,64,1320,64,1380,64L1440,64L1440,120L1380,120C1320,120,1200,120,
               1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,
               60,120L0,120Z"
          ></path>
        </svg>
      </div>
    </div>

    <!-- ========== FEATURES SECTION ========== -->
    <div class="py-16">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold mb-4">Everything You Need</h2>
          <p class="text-gray-600">
            Built with Nuxt.js and modern technologies, optimized for AWS Amplify deployment
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Feature #1 -->
          <Card class="shadow-lg">
            <template #header>
              <i class="pi pi-shield text-4xl text-primary-500"></i>
            </template>
            <template #title>Authentication Ready</template>
            <template #content>
              Secure authentication system powered by AWS Amplify with social logins support.
            </template>
          </Card>

          <!-- Feature #2 -->
          <Card class="shadow-lg">
            <template #header>
              <i class="pi pi-credit-card text-4xl text-primary-500"></i>
            </template>
            <template #title>Stripe Integration</template>
            <template #content>
              Complete subscription management with Stripe for recurring payments.
            </template>
          </Card>

          <!-- Feature #3 -->
          <Card class="shadow-lg">
            <template #header>
              <i class="pi pi-users text-4xl text-primary-500"></i>
            </template>
            <template #title>User Management</template>
            <template #content>
              Comprehensive user management system with roles and permissions.
            </template>
          </Card>
        </div>
      </div>
    </div>

    <!-- ========== PRICING SECTION ========== -->
    <div class="bg-gray-50 py-16">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p class="text-gray-600">Choose the plan that works best for you</p>
        </div>

        <div class="max-w-5xl mx-auto">
          <!-- Using your existing custom pricing component -->
          <PlanVanilaCards :plans="plans" />
        </div>
      </div>
    </div>

    <!-- ========== CTA SECTION ========== -->
    <div class="bg-primary-900 text-white py-16">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-6">Ready to Get Started?</h2>
        <p class="text-xl mb-8 text-gray-200">
          Join thousands of developers building amazing products with Nuxt on AWS Amplify
        </p>
        <NuxtLink to="/app">
          <Button
            label="Launch Your Project"
            icon="pi pi-arrow-right"
            severity="success"
            size="large"
          />
        </NuxtLink>
      </div>
    </div>

    <!-- ========== FOOTER ========== -->
    <footer class="bg-white py-8 border-t mt-auto">
      <div class="container mx-auto px-4 text-center text-gray-500 text-sm">
        <p>&copy; 2025 YourCompany. All rights reserved.</p>
        <div class="mt-2 space-x-4">
          <NuxtLink to="/privacy" class="hover:text-primary-500">Privacy Policy</NuxtLink>
          <NuxtLink to="/terms" class="hover:text-primary-500">Terms & Conditions</NuxtLink>
          <NuxtLink to="/contact" class="hover:text-primary-500">Contact</NuxtLink>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlans } from '~/utils/usePlans'

// PrimeVue components
import Menubar from 'primevue/menubar'
import Button from 'primevue/button'
import Card from 'primevue/card'

// Fetch your pricing plans, as in original code
const { plans, error, fetchPlans } = usePlans()

// Example Menubar model for top navigation
const menuItems = [
  { label: 'Pricing', url: '/pricing' },
  { label: 'FAQ', url: '/faq' },
  { label: 'Changelog', url: '/changelog' },
  { label: 'Docs', url: '/docs' },
  {
    label: 'Dashboard',
    icon: 'pi pi-user',
    url: '/app'
  }
]

onMounted(async () => {
  try {
    await fetchPlans({ sortByIndex: true })
  } catch (err) {
    console.error('Error fetching plans:', err)
  }
})
</script>

<style scoped>
/* Keep your existing styling for cards, wave, etc. */
.p-card .p-card-header {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
}
.p-card .p-card-title {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 600;
}
.p-card .p-card-content {
  text-align: center;
  color: #64748b;
}

/* Example Menubar minimal styling */
.p-menubar {
  border: none;
  border-radius: 0;
  background-color: #fff;
}
.p-menubar .p-menubar-root-list > .p-menubaritem > .p-menuitem-link {
  font-weight: 500;
  color: #4b5563; /* Tailwind gray-700 */
}
.p-menubar .p-menubar-root-list > .p-menubaritem > .p-menuitem-link:hover {
  background-color: transparent;
  color: #000;
}
</style>