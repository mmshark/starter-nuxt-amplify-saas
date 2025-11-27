<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'default'
})

const { currentWorkspaceId, currentWorkspace, loadWorkspaces } = useWorkspaces()
const showInviteModal = ref(false)
const q = ref('')

// Redirect if no workspace is selected
watch(currentWorkspaceId, (id) => {
  if (!id) {
    navigateTo('/settings/workspaces')
  }
})

// Initialize composable with reactive workspace ID
const { members, invitations, loadMembers, loadInvitations } = useWorkspaceMembers(currentWorkspaceId)

const filteredMembers = computed(() => {
  if (!q.value) return members.value
  return members.value.filter((member) => {
    const searchText = q.value.toLowerCase()
    return member.name?.toLowerCase().includes(searchText) ||
           member.email.toLowerCase().includes(searchText)
  })
})

// Load data on mount
onMounted(async () => {
  await loadWorkspaces()

  if (!currentWorkspaceId.value) {
    navigateTo('/settings/workspaces')
    return
  }

  await Promise.all([
    loadMembers(),
    loadInvitations()
  ])
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold">Team Members</h2>
      <p class="text-gray-500 mt-1">Manage your workspace team members and invitations.</p>
    </div>

    <!-- Header Actions -->
    <div class="flex items-center justify-between">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        placeholder="Search members..."
        class="w-full max-w-xs"
      />
      <UButton
        icon="i-lucide-user-plus"
        @click="showInviteModal = true"
      >
        Invite Member
      </UButton>
    </div>

    <!-- Members List -->
    <TeamMembersList v-if="currentWorkspaceId" :workspace-id="currentWorkspaceId" />

    <!-- Pending Invitations -->
    <div v-if="invitations.length > 0" class="mt-8">
      <h3 class="text-lg font-semibold mb-4">
        Pending Invitations
      </h3>
      <div class="space-y-2">
        <UCard v-for="invitation in invitations" :key="invitation.id">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">{{ invitation.email }}</p>
              <p class="text-sm text-gray-500">
                Role: {{ invitation.role }} · Invited by {{ invitation.inviterName }}
              </p>
              <p v-if="invitation.message" class="text-sm text-gray-600 mt-1">
                {{ invitation.message }}
              </p>
            </div>
            <UBadge color="yellow" variant="subtle">
              Pending
            </UBadge>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Invite Member Modal -->
    <InviteTeamMemberModal
      v-if="currentWorkspaceId"
      v-model="showInviteModal"
      :workspace-id="currentWorkspaceId"
    />
  </div>
</template>
