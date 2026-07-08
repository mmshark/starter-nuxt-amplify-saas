import type { InviteMemberInput, WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from '../types/workspaces';

export const useWorkspaceMembers = (workspaceId: MaybeRefOrGetter<string | null | undefined>) => {
  // Use useAsyncData for caching and hydration
  const { data: members, refresh: refreshMembers, status: membersStatus } = useAsyncData<WorkspaceMember[]>(
    () => `members-${toValue(workspaceId)}`,
    async () => {
      const id = toValue(workspaceId)
      if (!id) return []
      // Explicit generic: the route returns WorkspaceMember[]. Without it, $fetch
      // infers from the typed route registry and blows the instantiation depth
      // (TS2321) against the demo API routes.
      return $fetch<WorkspaceMember[]>(`/api/workspaces/${id}/members`)
    },
    {
      default: () => [],
      watch: [() => toValue(workspaceId)]
    }
  )

  const { data: invitations, refresh: refreshInvitations, status: invitationsStatus } = useAsyncData<WorkspaceInvitation[]>(
    () => `invitations-${toValue(workspaceId)}`,
    async () => {
      const id = toValue(workspaceId)
      if (!id) return []
      // Explicit generic (see members above): avoids the typed-route
      // instantiation-depth blow-up (TS2321) against the demo API routes.
      return $fetch<WorkspaceInvitation[]>(`/api/workspaces/${id}/invitations`)
    },
    {
      default: () => [],
      watch: [() => toValue(workspaceId)]
    }
  )

  const loading = computed(() => membersStatus.value === 'pending' || invitationsStatus.value === 'pending')

  // Helper to manually reload both
  const loadMembers = async () => {
    await Promise.all([refreshMembers(), refreshInvitations()])
  }

  const inviteMember = async (input: InviteMemberInput) => {
    const id = toValue(workspaceId)
    try {
      await $fetch(`/api/workspaces/${id}/members/invite`, {
        method: 'POST',
        body: input
      })
      await refreshInvitations()
    } catch (error) {
      console.error('Failed to invite member:', error)
      throw error
    }
  }

  const removeMember = async (userId: string) => {
    const id = toValue(workspaceId)
    // Optimistic update
    const previousMembers = [...(members.value || [])]
    members.value = previousMembers.filter(m => m.userId !== userId)

    try {
      await $fetch(`/api/workspaces/${id}/members/${userId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Failed to remove member:', error)
      // Revert on error
      members.value = previousMembers
      throw error
    }
  }

  const updateMemberRole = async (userId: string, role: WorkspaceRole) => {
    const id = toValue(workspaceId)
    // Optimistic update
    const previousMembers = JSON.parse(JSON.stringify(members.value || []))
    const memberIndex = members.value?.findIndex(m => m.userId === userId)

    if (memberIndex !== undefined && memberIndex !== -1 && members.value) {
      members.value[memberIndex]!.role = role
    }

    try {
      await $fetch(`/api/workspaces/${id}/members/${userId}/role`, {
        method: 'PATCH',
        body: { role }
      })
    } catch (error) {
      console.error('Failed to update member role:', error)
      // Revert on error
      members.value = previousMembers
      throw error
    }
  }

  return {
    members,
    invitations,
    loading,
    loadMembers,
    loadInvitations: refreshInvitations,
    inviteMember,
    removeMember,
    updateMemberRole
  }
}
