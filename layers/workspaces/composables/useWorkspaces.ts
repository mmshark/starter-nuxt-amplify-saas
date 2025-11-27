import type { CreateWorkspaceInput, Workspace } from '../types/workspaces'

export const useWorkspaces = () => {
  const { currentUser: user } = useUser()

  const workspaces = useState<Workspace[]>('workspaces', () => [])
  const workspaceCookie = useCookie('current-workspace-id')
  const currentWorkspaceId = useState<string | null>('currentWorkspaceId', () => workspaceCookie.value || null)
  const loading = useState<boolean>('workspaces-loading', () => false)

  const currentWorkspace = computed(() =>
    workspaces.value.find(w => w.id === currentWorkspaceId.value) || null
  )

  const personalWorkspace = computed(() =>
    workspaces.value.find(w => w.isPersonal && w.ownerId === user.value?.id) || null
  )

  const loadWorkspaces = async () => {
    if (!user.value) return

    loading.value = true
    try {
      const result = await $fetch<Workspace[]>('/api/workspaces')
      workspaces.value = result

      // Auto-select workspace if none selected
      if (!currentWorkspaceId.value && workspaces.value.length > 0) {
        // Prefer personal workspace, otherwise first available
        const personal = workspaces.value.find(w => w.isPersonal)
        currentWorkspaceId.value = personal ? personal.id : workspaces.value[0].id
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    } finally {
      loading.value = false
    }
  }

  const createWorkspace = async (input: CreateWorkspaceInput) => {
    loading.value = true
    try {
      const newWorkspace = await $fetch<Workspace>('/api/workspaces', {
        method: 'POST',
        body: input
      })
      workspaces.value.push(newWorkspace)
      currentWorkspaceId.value = newWorkspace.id
      return newWorkspace
    } catch (error) {
      console.error('Failed to create workspace:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const switchWorkspace = (workspaceId: string) => {
    const workspace = workspaces.value.find(w => w.id === workspaceId)
    if (workspace) {
      currentWorkspaceId.value = workspaceId
      const workspaceCookie = useCookie('current-workspace-id')
      workspaceCookie.value = workspaceId
    }
  }

  return {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    personalWorkspace,
    loading,
    loadWorkspaces,
    createWorkspace,
    switchWorkspace
  }
}
