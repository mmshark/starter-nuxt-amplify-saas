<script setup lang="ts">
useSeoMeta({
  title: 'Billing Settings',
  description: 'Manage your subscription and billing information'
})

const billing = useBilling()
const { isFreePlan } = billing
const { isOwner } = useWorkspaceMembership()

const route = useRoute()
const router = useRouter()

// After returning from Stripe checkout (`?session_id=…`) the webhook that writes
// WorkspaceSubscription can lag the redirect by a few seconds (E05 Risk). Show an
// "activating" state and poll until the plan leaves `free`, then clean the URL.
const activating = ref(false)

onMounted(async () => {
  await billing.ensureInitialized()

  if (route.query.session_id) {
    activating.value = true
    try {
      for (let attempt = 0; attempt < 15; attempt++) {
        await billing.refreshSubscription()
        if (billing.currentPlanId.value !== 'free') break
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } finally {
      activating.value = false
      router.replace({ query: {} })
    }
  }
})
</script>

<template>
  <UPageCard
    title="Billing"
    description="Manage your subscription and billing information"
  >
    <div class="space-y-6">
      <UAlert
        v-if="activating"
        color="info"
        variant="subtle"
        icon="i-lucide-loader-circle"
        title="Activating your subscription…"
        description="This can take a few seconds while we confirm your payment."
      />

      <CurrentSubscription>
        <!-- Free workspace: the Customer Portal cannot start a first
             subscription, so route to the in-app plans page instead. Gated to
             the workspace owner (server also enforces manage-billing). -->
        <template #actions="{ loading, openPortal }">
          <UButton
            v-if="isFreePlan"
            :to="isOwner ? '/settings/billing/plans' : undefined"
            :disabled="!isOwner"
            :title="isOwner ? undefined : 'Only the workspace owner can upgrade'"
            icon="i-lucide-arrow-up-circle"
          >
            Upgrade
          </UButton>
          <UButton
            v-else
            variant="outline"
            :loading="loading"
            @click="openPortal"
          >
            Change Plan
          </UButton>
        </template>
      </CurrentSubscription>
      <PaymentMethod />
      <InvoicesList />
    </div>
  </UPageCard>
</template>
