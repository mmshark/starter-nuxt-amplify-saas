<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Team Members</h3>
      <UButton
        v-if="canInvite"
        icon="i-heroicons-user-plus"
        @click="showInviteModal = true"
        color="black"
      >
        Invite Member
      </UButton>
    </div>

    <UTable
      :rows="members"
      :columns="columns"
      :loading="loading"
    >
      <template #name-data="{ row }">
        <div class="flex items-center gap-2">
          <UAvatar :alt="row.name || row.email" size="sm" />
          <div>
            <p class="font-medium">{{ row.name || 'Pending...' }}</p>
            <p class="text-sm text-gray-500">{{ row.email }}</p>
          </div>
        </div>
      </template>

      <template #role-data="{ row }">
        <USelect
          v-if="canManageRole(row)"
          v-model="row.role"
          :options="roleOptions"
          size="xs"
          @change="updateRole(row)"
        />
        <UBadge v-else :color="getRoleColor(row.role)" variant="subtle">
          {{ row.role }}
        </UBadge>
      </template>

      <template #actions-data="{ row }">
        <UButton
          v-if="canRemove(row)"
          icon="i-heroicons-trash"
          color="red"
          variant="ghost"
          size="xs"
          @click="handleRemove(row)"
        />
      </template>
    </UTable>

    <InviteTeamMemberModal
      v-model="showInviteModal"
      :workspace-id="workspaceId"
      @invited="loadMembers"
    />
  </div>
</template>

<script setup lang="ts">
import type { WorkspaceMember, WorkspaceRole } from '../types/workspaces'

const props = defineProps<{
  workspaceId: string
}>()

const { members, loading, updateMemberRole, removeMember, loadMembers } = useWorkspaceMembers(props.workspaceId)
const { isOwner } = useWorkspace()
const { user } = useUser()
const toast = useToast()

const showInviteModal = ref(false)

// Load members on mount
onMounted(() => {
  loadMembers()
})

const columns = [
  { key: 'name', label: 'Member' },
  { key: 'role', label: 'Role' },
  { key: 'joinedAt', label: 'Joined' },
  { key: 'actions', label: '' }
]

const roleOptions = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OWNER', label: 'Owner' }
]

const getRoleColor = (role: WorkspaceRole) => {
  switch (role) {
    case 'OWNER': return 'primary'
    case 'ADMIN': return 'orange'
    default: return 'gray'
  }
}

const canInvite = computed(() => {
  return isOwner.value || members.value.some(m =>
    m.userId === user.value?.id && m.role === 'ADMIN'
  )
})

const canManageRole = (member: WorkspaceMember) => {
  if (member.role === 'OWNER') return false
  return isOwner.value
}

const canRemove = (member: WorkspaceMember) => {
  if (member.userId === user.value?.id) return false
  if (member.role === 'OWNER') return false
  return isOwner.value
}

const updateRole = async (member: WorkspaceMember) => {
  try {
    await updateMemberRole(member.userId, member.role)
    toast.add({ title: 'Role updated successfully' })
  } catch (error) {
    console.error('Failed to update role:', error)
    toast.add({ title: 'Failed to update role', color: 'red' })
    loadMembers() // Revert on error
  }
}

const handleRemove = async (member: WorkspaceMember) => {
  if (!confirm(`Remove ${member.email} from workspace?`)) return

  try {
    await removeMember(member.userId)
    toast.add({ title: 'Member removed successfully' })
  } catch (error) {
    console.error('Failed to remove member:', error)
    toast.add({ title: 'Failed to remove member', color: 'red' })
  }
}
</script>
