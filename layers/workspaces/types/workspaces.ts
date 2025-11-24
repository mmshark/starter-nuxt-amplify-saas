export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string | null
  ownerId: string
  isPersonal: boolean
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  workspaceId: string
  userId: string
  email: string
  name?: string | null
  role: WorkspaceRole
  joinedAt: string
}

export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  email: string
  role: WorkspaceRole
  invitedBy: string
  inviterName?: string | null
  token: string
  expiresAt: string
  message?: string | null
}

export interface CreateWorkspaceInput {
  name: string
  slug?: string
  description?: string
}

export interface InviteMemberInput {
  email: string
  role: WorkspaceRole
  message?: string
}
