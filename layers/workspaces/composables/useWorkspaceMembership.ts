/**
 * useWorkspaceMembership Composable
 *
 * Provides access to the current user's workspace membership and role.
 * Used by Entitlements layer to determine user permissions.
 */

import type { WorkspaceMember, WorkspaceRole } from '../types/workspaces'

export const useWorkspaceMembership = () => {
  const { currentUser } = useUser()
  const { currentWorkspace, currentWorkspaceId } = useWorkspaces()

  // Only initialize if we have a workspace ID
  const { members, loadMembers } = currentWorkspaceId.value
    ? useWorkspaceMembers(currentWorkspaceId.value)
    : { members: ref([]), loadMembers: async () => {} }

  /**
   * Current user's membership in the active workspace
   */
  const currentMembership = computed<WorkspaceMember | null>(() => {
    if (!currentUser.value?.userId || !currentWorkspaceId.value) return null
    return members.value.find(m => m.userId === currentUser.value?.userId) || null
  })

  /**
   * Current user's role in the active workspace
   */
  const currentRole = computed<WorkspaceRole | null>(() => {
    return currentMembership.value?.role || null
  })

  /**
   * Check if current user is the workspace owner
   */
  const isOwner = computed(() => {
    if (!currentUser.value?.userId || !currentWorkspace.value) return false
    return currentWorkspace.value.ownerId === currentUser.value.userId || currentRole.value === 'OWNER'
  })

  /**
   * Check if current user is admin or owner
   */
  const isAdminOrOwner = computed(() => {
    return currentRole.value === 'ADMIN' || currentRole.value === 'OWNER' || isOwner.value
  })

  return {
    currentMembership: readonly(currentMembership),
    currentRole: readonly(currentRole),
    isOwner: readonly(isOwner),
    isAdminOrOwner: readonly(isAdminOrOwner),
    loadMembers,
  }
}
