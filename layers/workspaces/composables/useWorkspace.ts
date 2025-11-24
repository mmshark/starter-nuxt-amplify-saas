export const useWorkspace = () => {
  const { currentWorkspace, currentWorkspaceId } = useWorkspaces()
  const { user } = useUser()

  const isOwner = computed(() =>
    currentWorkspace.value?.ownerId === user.value?.id
  )

  const requireWorkspace = () => {
    if (!currentWorkspace.value) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found'
      })
    }
    return currentWorkspace.value
  }

  return {
    workspace: currentWorkspace,
    workspaceId: currentWorkspaceId,
    isOwner,
    requireWorkspace
  }
}
