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
      :data="members"
      :columns="columns"
      :loading="loading"
    />

    <InviteTeamMemberModal
      v-model="showInviteModal"
      :workspace-id="workspaceId"
      @invited="loadMembers"
    />
  </div>
</template>

<script setup lang="ts">
import type { WorkspaceMember, WorkspaceRole } from '../types/workspaces'
import type { TableColumn } from '@nuxt/ui'

const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const USelect = resolveComponent('USelect')

const props = defineProps<{
  workspaceId: string
}>()

const { members, loading, updateMemberRole, removeMember, loadMembers } = useWorkspaceMembers(() => props.workspaceId)
const { isOwner } = useWorkspaceMembership()
const { currentUser } = useUser()
const toast = useToast()

const showInviteModal = ref(false)

// Load members on mount
onMounted(() => {
  loadMembers()
})

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

const columns: TableColumn<WorkspaceMember>[] = [
  {
    accessorKey: 'name',
    header: 'Member',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UAvatar, {
          alt: row.original.name || row.original.email,
          size: 'sm'
        }),
        h('div', undefined, [
          h('p', { class: 'font-medium' }, row.original.name || 'Pending...'),
          h('p', { class: 'text-sm text-gray-500' }, row.original.email)
        ])
      ])
    }
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      if (canManageRole(row.original)) {
        return h(USelect, {
          modelValue: row.original.role,
          'onUpdate:modelValue': (value: WorkspaceRole) => {
            row.original.role = value
            updateRole(row.original)
          },
          items: roleOptions.map(opt => ({ label: opt.label, value: opt.value })),
          size: 'xs'
        })
      }
      return h(UBadge, {
        color: getRoleColor(row.original.role),
        variant: 'subtle'
      }, () => row.original.role)
    }
  },
  {
    accessorKey: 'joinedAt',
    header: 'Joined'
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      if (!canRemove(row.original)) return null

      return h('div', { class: 'text-right' },
        h(UButton, {
          icon: 'i-heroicons-trash',
          color: 'red',
          variant: 'ghost',
          size: 'xs',
          onClick: () => handleRemove(row.original)
        })
      )
    }
  }
]

const canInvite = computed(() => {
  return isOwner.value || members.value.some(m =>
    m.userId === currentUser.value?.userId && m.role === 'ADMIN'
  )
})

const canManageRole = (member: WorkspaceMember) => {
  if (member.role === 'OWNER') return false
  return isOwner.value
}

const canRemove = (member: WorkspaceMember) => {
  if (member.userId === currentUser.value?.userId) return false
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
