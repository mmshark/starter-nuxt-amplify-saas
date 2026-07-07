/**
 * Cognito group names backing the group-per-workspace tenancy model.
 *
 * Every workspace is guarded by TWO Cognito user pool groups:
 *
 *  - `ws:<workspaceId>:members` — the READER group. Every member of the
 *    workspace (OWNER, ADMIN and MEMBER) belongs to it. Records that carry
 *    this group name in their `readerGroups` field are readable by the
 *    group's members via `allow.groupsDefinedIn('readerGroups').to(['read'])`.
 *
 *  - `ws:<workspaceId>:admins` — the WRITER group. Only OWNER and ADMIN
 *    members belong to it. Records that carry this group name in their
 *    `writerGroups` field grant full CRUD via
 *    `allow.groupsDefinedIn('writerGroups')`.
 *
 * See `apps/backend/amplify/data/resource.ts` for the authorization rules and
 * `apps/backend/amplify/functions/workspace-membership/` for the Lambda that
 * creates/deletes the groups and manages membership (Cognito admin APIs).
 *
 * IMPORTANT: group membership is carried in the user's Cognito access/id
 * token (`cognito:groups` claim). Changes only take effect after the user's
 * next token refresh — clients should force-refresh their session after
 * creating or joining a workspace.
 */

export const workspaceReaderGroup = (workspaceId: string): string =>
  `ws:${workspaceId}:members`

export const workspaceWriterGroup = (workspaceId: string): string =>
  `ws:${workspaceId}:admins`

/**
 * The `readerGroups`/`writerGroups` field values every tenant record
 * (Workspace, WorkspaceMember, WorkspaceInvitation, WorkspaceSubscription)
 * must be created with.
 */
export const workspaceGroupFields = (workspaceId: string): {
  readerGroups: string[]
  writerGroups: string[]
} => ({
  readerGroups: [workspaceReaderGroup(workspaceId)],
  writerGroups: [workspaceWriterGroup(workspaceId)],
})
