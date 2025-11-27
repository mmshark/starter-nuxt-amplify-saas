<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'default'
})

const { workspaces, currentWorkspace, switchWorkspace, loadWorkspaces } = useWorkspaces()
const { currentRole, isAdminOrOwner } = useWorkspaceMembership()
const showCreateModal = ref(false)

// Load workspaces on mount
onMounted(() => {
  loadWorkspaces()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Current Workspace -->
    <div v-if="currentWorkspace">
            <h3 class="text-lg font-semibold mb-4">
              Current Workspace
            </h3>
            <UCard>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <UAvatar
                    :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(currentWorkspace.name)}&background=random`"
                    :alt="currentWorkspace.name"
                    size="lg"
                  />
                  <div>
                    <p class="font-semibold">{{ currentWorkspace.name }}</p>
                    <p class="text-sm text-gray-500">{{ currentWorkspace.slug }}</p>
                    <p v-if="currentWorkspace.description" class="text-sm text-gray-600 mt-1">
                      {{ currentWorkspace.description }}
                    </p>
                    <UBadge v-if="currentWorkspace.isPersonal" color="gray" variant="subtle" class="mt-2">
                      Personal
                    </UBadge>
                    <UBadge v-if="currentRole" :color="currentRole === 'OWNER' ? 'green' : currentRole === 'ADMIN' ? 'blue' : 'gray'" variant="subtle" class="mt-2 ml-2">
                      {{ currentRole }}
                    </UBadge>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    v-if="isAdminOrOwner"
                    to="/settings/members"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-users"
                  >
                    Manage Team
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>

          <!-- All Workspaces -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold">
                All Workspaces
              </h3>
              <UButton
                icon="i-lucide-plus"
                @click="showCreateModal = true"
              >
                Create Workspace
              </UButton>
            </div>

            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <UCard
                v-for="workspace in workspaces"
                :key="workspace.id"
                :class="{ 'ring-2 ring-primary': workspace.id === currentWorkspace?.id }"
              >
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <UAvatar
                      :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(workspace.name)}&background=random`"
                      :alt="workspace.name"
                      size="md"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold truncate">{{ workspace.name }}</p>
                      <p class="text-sm text-gray-500 truncate">{{ workspace.slug }}</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <UBadge v-if="workspace.isPersonal" color="gray" variant="subtle" size="xs">
                      Personal
                    </UBadge>
                    <UBadge color="gray" variant="subtle" size="xs">
                      {{ workspace.memberCount }} {{ workspace.memberCount === 1 ? 'member' : 'members' }}
                    </UBadge>
                  </div>

                  <UButton
                    v-if="workspace.id !== currentWorkspace?.id"
                    block
                    color="primary"
                    variant="soft"
                    @click="switchWorkspace(workspace.id)"
                  >
                    Switch to this workspace
                  </UButton>
                  <UButton
                    v-else
                    block
                    color="primary"
                    disabled
                  >
                    Current workspace
                  </UButton>
                </div>
              </UCard>
            </div>

            <div v-if="workspaces.length === 0" class="text-center py-12">
              <p class="text-gray-500 mb-4">No workspaces yet</p>
              <UButton
                icon="i-lucide-plus"
                @click="showCreateModal = true"
              >
                Create your first workspace
              </UButton>
            </div>
          </div>

    <!-- Create Workspace Modal -->
    <CreateWorkspaceModal v-model="showCreateModal" />
  </div>
</template>
