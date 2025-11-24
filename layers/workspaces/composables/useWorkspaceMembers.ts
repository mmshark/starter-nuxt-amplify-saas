import type { InviteMemberInput, WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from '../types/workspaces'

export const useWorkspaceMembers = (workspaceId: string) => {
  const members = useState<WorkspaceMember[]>(`members-${workspaceId}`, () => [])
  const invitations = useState<WorkspaceInvitation[]>(`invitations-${workspaceId}`, () => [])
  const loading = useState<boolean>(`members-loading-${workspaceId}`, () => false)

  const loadMembers = async () => {
    loading.value = true
    try {
      const result = await $fetch<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`)
      members.value = result
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      loading.value = false
    }
  }

  const loadInvitations = async () => {
    try {
      const result = await $fetch<WorkspaceInvitation[]>(`/api/workspaces/${workspaceId}/invitations`)
      invitations.value = result
    } catch (error) {
      console.error('Failed to load invitations:', error)
    }
  }

  const inviteMember = async (input: InviteMemberInput) => {
    try {
      await $fetch(`/api/workspaces/${workspaceId}/members/invite`, {
        method: 'POST',
        body: input
      })
      await loadInvitations()
    } catch (error) {
      console.error('Failed to invite member:', error)
      throw error
    }
  }

  const removeMember = async (userId: string) => {
    try {
      await $fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE'
      })
      await loadMembers()
    } catch (error) {
      console.error('Failed to remove member:', error)
      throw error
    }
  }

  const updateMemberRole = async (userId: string, role: WorkspaceRole) => {
    try {
      await $fetch(`/api/workspaces/${workspaceId}/members/${userId}/role`, {
        method: 'PATCH',
        body: { role }
      })
      await loadMembers()
    } catch (error) {
      console.error('Failed to update member role:', error)
      throw error
    }
  }

  return {
    members,
    invitations,
    loading,
    loadMembers,
    loadInvitations,
    inviteMember,
    removeMember,
    updateMemberRole
  }
}
