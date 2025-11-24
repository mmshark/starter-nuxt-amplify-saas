import type { InviteMemberInput, WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from '../types/workspaces'

export const useWorkspaceMembers = (workspaceId: string) => {
  const { $client } = useNuxtApp()

  const members = useState<WorkspaceMember[]>(`members-${workspaceId}`, () => [])
  const invitations = useState<WorkspaceInvitation[]>(`invitations-${workspaceId}`, () => [])
  const loading = useState<boolean>(`members-loading-${workspaceId}`, () => false)

  const loadMembers = async () => {
    loading.value = true
    try {
      const result = await $client.workspaces.listMembers.query({ workspaceId })
      members.value = result
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      loading.value = false
    }
  }

  const loadInvitations = async () => {
    try {
      const result = await $client.workspaces.listInvitations.query({ workspaceId })
      invitations.value = result
    } catch (error) {
      console.error('Failed to load invitations:', error)
    }
  }

  const inviteMember = async (input: InviteMemberInput) => {
    try {
      await $client.workspaces.inviteMember.mutate({ workspaceId, ...input })
      await loadInvitations()
    } catch (error) {
      console.error('Failed to invite member:', error)
      throw error
    }
  }

  const removeMember = async (userId: string) => {
    try {
      await $client.workspaces.removeMember.mutate({ workspaceId, userId })
      await loadMembers()
    } catch (error) {
      console.error('Failed to remove member:', error)
      throw error
    }
  }

  const updateMemberRole = async (userId: string, role: WorkspaceRole) => {
    try {
      await $client.workspaces.updateMemberRole.mutate({ workspaceId, userId, role })
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
