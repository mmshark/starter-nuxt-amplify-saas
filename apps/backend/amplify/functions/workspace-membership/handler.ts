import type { Handler } from 'aws-lambda'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { type Schema } from '../../data/resource'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { env } from '$amplify/env/workspace-membership'
import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  DeleteGroupCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import Stripe from 'stripe'
import { ensureWorkspaceBilling } from '@mmshark/billing-layer/server/utils/ensureWorkspaceBilling'
import {
  workspaceReaderGroup,
  workspaceWriterGroup,
  workspaceGroupFields,
} from '@mmshark/amplify-layer/server/utils/workspaceGroups'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)

Amplify.configure(resourceConfig, libraryOptions)

const client = generateClient<Schema>()
const cognito = new CognitoIdentityProviderClient()
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
})

/**
 * User pool id. `WORKSPACE_MEMBERSHIP_USER_POOL_ID` is set explicitly in
 * `backend.ts`; `AMPLIFY_AUTH_USERPOOL_ID` is the variable Amplify injects
 * for functions granted auth access — either works.
 */
function requireUserPoolId(): string {
  const userPoolId =
    process.env.WORKSPACE_MEMBERSHIP_USER_POOL_ID || process.env.AMPLIFY_AUTH_USERPOOL_ID
  if (!userPoolId) {
    throw new Error(
      'No user pool id available (WORKSPACE_MEMBERSHIP_USER_POOL_ID / AMPLIFY_AUTH_USERPOOL_ID)'
    )
  }
  return userPoolId
}

interface Caller {
  /** Cognito `sub` — what WorkspaceMember.userId stores. */
  userId: string
  /** Cognito username (used for Admin* group calls). */
  username: string
  email: string
  name: string
}

interface MembershipEvent {
  action:
    | 'createWorkspace'
    | 'updateWorkspace'
    | 'createInvitation'
    | 'acceptInvitation'
    | 'declineInvitation'
    | 'updateMemberRole'
    | 'removeMember'
    | 'deleteWorkspace'
    | 'ensureBilling'
  /** The CALLER's Cognito access token; verified via GetUser, never trusted raw. */
  accessToken: string
  name?: string
  slug?: string
  description?: string
  workspaceId?: string
  invitationId?: string
  targetUserId?: string
  role?: string
  email?: string
  message?: string
  /** Invitation token the caller must present to accept/decline as the invitee. */
  token?: string
}

type MembershipResult =
  | { ok: true; data: unknown }
  | { ok: false; statusCode: number; message: string }

/** Business-rule failure carrying the HTTP status the Nitro route should return. */
class MembershipError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message)
    this.name = 'MembershipError'
  }
}

const ok = (data: unknown): MembershipResult => ({ ok: true, data })
const fail = (statusCode: number, message: string): MembershipResult => ({
  ok: false,
  statusCode,
  message,
})

export const handler: Handler<MembershipEvent, MembershipResult> = async (event) => {
  if (!event || typeof event.accessToken !== 'string' || !event.accessToken || !event.action) {
    return fail(400, 'Invalid workspace-membership invocation payload')
  }

  // AUTHENTICATION: verify the caller's access token against the user pool.
  // GetUser is authorized by the token itself; an invalid/expired/forged
  // token is rejected by Cognito. The caller identity used below comes ONLY
  // from this verified token — never from the invocation payload.
  let caller: Caller
  try {
    caller = await resolveCaller(event.accessToken)
  } catch (error) {
    console.error('workspace-membership: access token verification failed:', error)
    return fail(401, 'Invalid or expired access token')
  }

  try {
    switch (event.action) {
      case 'createWorkspace':
        return ok(await createWorkspace(caller, event))
      case 'updateWorkspace':
        return ok(await updateWorkspace(caller, event))
      case 'createInvitation':
        return ok(await createInvitation(caller, event))
      case 'acceptInvitation':
        return ok(await acceptInvitation(caller, event))
      case 'declineInvitation':
        return ok(await declineInvitation(caller, event))
      case 'updateMemberRole':
        return ok(await updateMemberRole(caller, event))
      case 'removeMember':
        return ok(await removeMember(caller, event))
      case 'deleteWorkspace':
        return ok(await deleteWorkspace(caller, event))
      case 'ensureBilling':
        return ok(await ensureBilling(caller, event))
      default:
        return fail(400, `Unknown action: ${String(event.action)}`)
    }
  } catch (error) {
    if (error instanceof MembershipError) {
      return fail(error.statusCode, error.message)
    }
    console.error(`workspace-membership: ${event.action} failed:`, error)
    return fail(500, 'Workspace membership operation failed')
  }
}

async function resolveCaller(accessToken: string): Promise<Caller> {
  const user = await cognito.send(new GetUserCommand({ AccessToken: accessToken }))

  const attributes: Record<string, string> = {}
  for (const attribute of user.UserAttributes ?? []) {
    if (attribute.Name && attribute.Value !== undefined) {
      attributes[attribute.Name] = attribute.Value
    }
  }

  const userId = attributes.sub
  const email = attributes.email
  if (!user.Username || !userId || !email) {
    throw new Error('Access token did not resolve to a user with sub + email')
  }

  const firstName = attributes.given_name || ''
  const lastName = attributes.family_name || ''
  const name =
    attributes.name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '')

  return { userId, username: user.Username, email, name }
}

// ---------------------------------------------------------------------------
// Cognito group helpers
// ---------------------------------------------------------------------------

function isCognitoError(error: unknown, ...names: string[]): boolean {
  return error instanceof Error && names.includes(error.name)
}

async function createWorkspaceGroups(workspaceId: string): Promise<void> {
  const userPoolId = requireUserPoolId()
  const groups: Array<{ name: string; description: string }> = [
    { name: workspaceReaderGroup(workspaceId), description: `Members of workspace ${workspaceId}` },
    { name: workspaceWriterGroup(workspaceId), description: `Admins of workspace ${workspaceId}` },
  ]
  for (const group of groups) {
    try {
      await cognito.send(
        new CreateGroupCommand({
          UserPoolId: userPoolId,
          GroupName: group.name,
          Description: group.description,
        })
      )
    } catch (error) {
      // Idempotent: a retried invocation may find the group already there.
      if (!isCognitoError(error, 'GroupExistsException')) throw error
    }
  }
}

async function deleteWorkspaceGroups(workspaceId: string): Promise<void> {
  const userPoolId = requireUserPoolId()
  for (const groupName of [workspaceReaderGroup(workspaceId), workspaceWriterGroup(workspaceId)]) {
    try {
      await cognito.send(new DeleteGroupCommand({ UserPoolId: userPoolId, GroupName: groupName }))
    } catch (error) {
      if (!isCognitoError(error, 'ResourceNotFoundException')) throw error
    }
  }
}

/**
 * NOTE: `username` may be the user's `sub`. With `loginWith: { email: true }`
 * (username attributes, no username aliases) Cognito Admin* APIs accept the
 * sub of a local user as the Username parameter.
 */
async function addUserToGroups(username: string, groupNames: string[]): Promise<void> {
  const userPoolId = requireUserPoolId()
  for (const groupName of groupNames) {
    await cognito.send(
      new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: username, GroupName: groupName })
    )
  }
}

async function removeUserFromGroups(username: string, groupNames: string[]): Promise<void> {
  const userPoolId = requireUserPoolId()
  for (const groupName of groupNames) {
    try {
      await cognito.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: userPoolId,
          Username: username,
          GroupName: groupName,
        })
      )
    } catch (error) {
      // Tolerate users/groups that are already gone.
      if (!isCognitoError(error, 'ResourceNotFoundException', 'UserNotFoundException')) throw error
    }
  }
}

// ---------------------------------------------------------------------------
// Shared lookups
// ---------------------------------------------------------------------------

async function getMembership(workspaceId: string, userId: string) {
  const { data: members } = await client.models.WorkspaceMember.list({
    filter: { and: [{ workspaceId: { eq: workspaceId } }, { userId: { eq: userId } }] },
  })
  return members?.[0] ?? null
}

async function requireRole(
  workspaceId: string,
  userId: string,
  roles: ReadonlyArray<'OWNER' | 'ADMIN' | 'MEMBER'>,
  message: string
) {
  const membership = await getMembership(workspaceId, userId)
  if (!membership) {
    throw new MembershipError(403, 'You are not a member of this workspace')
  }
  if (!membership.role || !(roles as readonly string[]).includes(membership.role)) {
    throw new MembershipError(403, message)
  }
  return membership
}

function requireParam(value: string | undefined, name: string): string {
  if (!value || typeof value !== 'string') {
    throw new MembershipError(400, `${name} is required`)
  }
  return value
}

/**
 * Constant-time invitation-token check. The stored token is the only proof
 * that the caller actually holds the emailed invitation link (as opposed to
 * merely knowing the invitation's UUID and their own email address, which is
 * often guessable/enumerable). Buffer length is compared first — this leaks
 * only the token length, never its content or a timing side-channel on the
 * comparison itself.
 */
function requireTokenMatch(provided: string | undefined, expected: string | null | undefined): void {
  if (!expected || typeof provided !== 'string' || !provided) {
    throw new MembershipError(403, 'A valid invitation token is required')
  }
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  const matches =
    providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer)
  if (!matches) {
    throw new MembershipError(403, 'Invalid invitation token')
  }
}

/**
 * Strict set-equality between a stored group-field value (nullable array of
 * nullable strings, as Amplify types it) and the expected canonical groups.
 * Fail-closed: null/undefined/partial values never match.
 */
function sameGroupSet(
  actual: ReadonlyArray<string | null> | null | undefined,
  expected: ReadonlyArray<string>
): boolean {
  if (!actual || actual.length !== expected.length) return false
  const actualSorted = actual.map((value) => value ?? '').sort()
  const expectedSorted = [...expected].sort()
  return expectedSorted.every((value, index) => value === actualSorted[index])
}

/**
 * Recompute `memberCount` from the actual `WorkspaceMember` rows rather than
 * a read-modify-write `+1`/`-1` on the cached counter. A blind increment can
 * drift permanently under a retried Lambda invocation or concurrent
 * add/remove (double-count or under-count with no self-correction);
 * recomputing from source truth after every membership change is
 * self-healing even if a previous update raced or was retried.
 */
async function recomputeMemberCount(workspaceId: string): Promise<void> {
  let count = 0
  let nextToken: string | null | undefined
  do {
    const { data: members, nextToken: next } = await client.models.WorkspaceMember.list({
      filter: { workspaceId: { eq: workspaceId } },
      nextToken: nextToken ?? undefined,
    })
    count += members?.length ?? 0
    nextToken = next
  } while (nextToken)

  await client.models.Workspace.update({ id: workspaceId, memberCount: count })
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function createWorkspace(caller: Caller, event: MembershipEvent) {
  const name = requireParam(event.name, 'name')
  const slug = event.slug || name.toLowerCase().replace(/\s+/g, '-')

  // Pre-generate the id so the record can be created WITH its group fields.
  const workspaceId = randomUUID()
  const groupFields = workspaceGroupFields(workspaceId)

  await createWorkspaceGroups(workspaceId)

  try {
    await addUserToGroups(caller.username, [...groupFields.readerGroups, ...groupFields.writerGroups])

    const { data: workspace, errors } = await client.models.Workspace.create({
      id: workspaceId,
      name,
      slug,
      description: event.description,
      ownerId: caller.userId,
      isPersonal: false,
      memberCount: 1,
      ...groupFields,
    })

    if (errors || !workspace) {
      console.error('Failed to create workspace:', errors)
      throw new MembershipError(500, 'Failed to create workspace')
    }

    const { data: member, errors: memberErrors } = await client.models.WorkspaceMember.create({
      workspaceId,
      userId: caller.userId,
      email: caller.email,
      name: caller.name || caller.email,
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
      ...groupFields,
    })

    if (memberErrors || !member) {
      console.error('Failed to create workspace owner membership:', memberErrors)
      await client.models.Workspace.delete({ id: workspaceId })
      throw new MembershipError(500, 'Failed to create workspace owner membership')
    }

    try {
      // One Stripe customer PER WORKSPACE. Idempotent on workspaceId, and it
      // cleans up its own orphaned Stripe customer on failure.
      await ensureWorkspaceBilling({
        workspaceId,
        stripe,
        client,
        customerEmail: caller.email,
        customerName: caller.name,
      })
    } catch (billingError) {
      console.error('Failed to provision workspace billing:', billingError)
      await client.models.WorkspaceMember.delete({ id: member.id })
      await client.models.Workspace.delete({ id: workspaceId })
      throw new MembershipError(500, 'Failed to provision workspace billing')
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description ?? undefined,
      ownerId: workspace.ownerId,
      isPersonal: workspace.isPersonal || false,
      memberCount: workspace.memberCount || 1,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    }
  } catch (error) {
    // Roll back the Cognito groups if the workspace never materialized.
    await deleteWorkspaceGroups(workspaceId).catch((cleanupError) =>
      console.error(`Failed to clean up groups for workspace ${workspaceId}:`, cleanupError)
    )
    throw error
  }
}

/**
 * Update a workspace's name/description. Tenant tables are read-only for
 * client principals (see amplify/data/resource.ts), so this is the ONLY path
 * that updates a Workspace row on behalf of a user. Only `name` and
 * `description` are updatable — `slug`, `ownerId`, `memberCount` and the
 * group fields can never be changed from client-supplied input.
 */
async function updateWorkspace(caller: Caller, event: MembershipEvent) {
  const workspaceId = requireParam(event.workspaceId, 'workspaceId')

  // AUTHORIZATION: verified caller must be OWNER or ADMIN of the workspace.
  await requireRole(
    workspaceId,
    caller.userId,
    ['OWNER', 'ADMIN'],
    'Only workspace owners and admins can update workspace settings'
  )

  const { data: workspace } = await client.models.Workspace.get({ id: workspaceId })
  if (!workspace) {
    throw new MembershipError(404, 'Workspace not found')
  }

  const updatePayload: { id: string; name?: string; description?: string } = { id: workspaceId }
  if (typeof event.name === 'string' && event.name.trim().length > 0) {
    updatePayload.name = event.name
  }
  if (typeof event.description === 'string') {
    updatePayload.description = event.description
  }

  const { data: updated, errors } = await client.models.Workspace.update(updatePayload)
  if (errors || !updated) {
    console.error('Failed to update workspace:', errors)
    throw new MembershipError(500, 'Failed to update workspace')
  }

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug || undefined,
    description: updated.description ?? undefined,
    ownerId: updated.ownerId,
    isPersonal: updated.isPersonal || false,
    memberCount: updated.memberCount || 0,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }
}

/**
 * Create a workspace invitation. This is the ONLY path that creates
 * WorkspaceInvitation rows (clients are read-only on the table), so every
 * invitation is guaranteed to have:
 *  - `readerGroups`/`writerGroups` derived from the workspace id
 *    (`workspaceGroupFields`) — NEVER from client input;
 *  - `invitedBy`/`inviterEmail` taken from the VERIFIED caller identity;
 *  - a role limited to ADMIN|MEMBER (an invitation can never grant OWNER);
 *  - an inviter whose OWNER/ADMIN role was re-checked here.
 */
async function createInvitation(caller: Caller, event: MembershipEvent) {
  const workspaceId = requireParam(event.workspaceId, 'workspaceId')
  const email = requireParam(event.email, 'email').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MembershipError(400, 'A valid email is required')
  }

  const role = event.role
  if (role !== 'ADMIN' && role !== 'MEMBER') {
    throw new MembershipError(400, 'role must be ADMIN or MEMBER')
  }

  // AUTHORIZATION: verified caller must be OWNER or ADMIN of the workspace.
  await requireRole(
    workspaceId,
    caller.userId,
    ['OWNER', 'ADMIN'],
    'Only workspace owners and admins can invite members'
  )

  // Reject a redundant invite: someone with this email is already a member,
  // or already has a live PENDING invitation to this workspace.
  const { data: existingMembers } = await client.models.WorkspaceMember.list({
    filter: { and: [{ workspaceId: { eq: workspaceId } }, { email: { eq: email } }] },
  })
  if (existingMembers && existingMembers.length > 0) {
    throw new MembershipError(409, 'This user is already a member of the workspace')
  }

  const { data: existingInvitations } = await client.models.WorkspaceInvitation.list({
    filter: {
      and: [
        { workspaceId: { eq: workspaceId } },
        { email: { eq: email } },
        { status: { eq: 'PENDING' } },
      ],
    },
  })
  if (existingInvitations && existingInvitations.length > 0) {
    throw new MembershipError(409, 'An invitation is already pending for this email')
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  const { data: invitation, errors } = await client.models.WorkspaceInvitation.create({
    workspaceId,
    email,
    role,
    invitedBy: caller.userId,
    inviterName: caller.name || caller.email,
    inviterEmail: caller.email,
    message: typeof event.message === 'string' ? event.message : undefined,
    token: randomUUID(),
    expiresAt: expiresAt.toISOString(),
    status: 'PENDING',
    // Group fields derive ONLY from the workspace id — never from the event.
    ...workspaceGroupFields(workspaceId),
  })

  if (errors || !invitation) {
    console.error('Failed to create invitation:', errors)
    throw new MembershipError(500, 'Failed to create invitation')
  }

  return { id: invitation.id, success: true, message: 'Invitation sent successfully' }
}

async function acceptInvitation(caller: Caller, event: MembershipEvent) {
  const workspaceId = requireParam(event.workspaceId, 'workspaceId')
  const invitationId = requireParam(event.invitationId, 'invitationId')

  const { data: invitation } = await client.models.WorkspaceInvitation.get({ id: invitationId })
  if (!invitation || invitation.workspaceId !== workspaceId) {
    throw new MembershipError(404, 'Invitation not found')
  }

  if (invitation.status && invitation.status !== 'PENDING') {
    throw new MembershipError(400, `Invitation is already ${invitation.status.toLowerCase()}`)
  }

  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    await client.models.WorkspaceInvitation.update({ id: invitationId, status: 'EXPIRED' })
    throw new MembershipError(400, 'Invitation has expired')
  }

  // The invitation email must match the VERIFIED caller email.
  if (!invitation.email || invitation.email.toLowerCase() !== caller.email.toLowerCase()) {
    throw new MembershipError(403, 'This invitation was sent to a different email address')
  }

  // The caller must also present the token from the emailed invitation link.
  // Email match alone is not proof of possession: workspace member emails are
  // visible to other members/admins, so without the token any of them could
  // "accept" on behalf of an invitee whose email they can see.
  requireTokenMatch(event.token, invitation.token)

  // PROVENANCE (defense-in-depth, fail-closed). Invitations are only ever
  // created by this function's `createInvitation`, but re-verify anyway so a
  // row injected through any other path can never grant membership:
  //
  // (a) The stored group fields must be EXACTLY the canonical groups derived
  //     from the workspace id. A mismatch means the row was not authored by
  //     the trusted path.
  const expectedGroups = workspaceGroupFields(workspaceId)
  if (
    !sameGroupSet(invitation.readerGroups, expectedGroups.readerGroups) ||
    !sameGroupSet(invitation.writerGroups, expectedGroups.writerGroups)
  ) {
    console.error(
      `acceptInvitation: invitation ${invitationId} group fields do not match workspace ${workspaceId}`
    )
    throw new MembershipError(403, 'Invitation is not valid for this workspace')
  }

  // (b) The inviter must hold an OWNER/ADMIN membership in the workspace.
  //     (Fail-closed: if the inviter has since left or been demoted, the
  //     invitation is no longer honored.)
  if (!invitation.invitedBy) {
    throw new MembershipError(403, 'Invitation has no valid inviter')
  }
  const inviterMembership = await getMembership(workspaceId, invitation.invitedBy)
  if (
    !inviterMembership ||
    !inviterMembership.role ||
    !['OWNER', 'ADMIN'].includes(inviterMembership.role)
  ) {
    console.error(
      `acceptInvitation: inviter ${invitation.invitedBy} is not an OWNER/ADMIN of workspace ${workspaceId}`
    )
    throw new MembershipError(403, 'Invitation was not issued by a workspace owner or admin')
  }

  // (c) An invitation can never grant OWNER (ownership only via createWorkspace).
  if (invitation.role === 'OWNER') {
    throw new MembershipError(403, 'Invitations cannot grant the OWNER role')
  }

  if (await getMembership(workspaceId, caller.userId)) {
    throw new MembershipError(409, 'You are already a member of this workspace')
  }

  const role = invitation.role || 'MEMBER'
  const groupFields = workspaceGroupFields(workspaceId)

  const { errors: memberErrors } = await client.models.WorkspaceMember.create({
    workspaceId,
    userId: caller.userId,
    email: caller.email,
    name: caller.name,
    role,
    joinedAt: new Date().toISOString(),
    ...groupFields,
  })

  if (memberErrors) {
    console.error('Failed to create membership:', memberErrors)
    throw new MembershipError(500, 'Failed to create membership')
  }

  // Data-layer access: members group always; admins group for ADMIN/OWNER.
  const groups =
    role === 'MEMBER'
      ? [workspaceReaderGroup(workspaceId)]
      : [workspaceReaderGroup(workspaceId), workspaceWriterGroup(workspaceId)]
  await addUserToGroups(caller.username, groups)

  await client.models.WorkspaceInvitation.update({ id: invitationId, status: 'ACCEPTED' })

  await recomputeMemberCount(workspaceId)

  return { success: true }
}

/**
 * Declining is allowed for two distinct callers:
 *  - the invitee themselves, in which case they must prove possession of the
 *    emailed token (same rationale as `acceptInvitation`);
 *  - a current workspace OWNER/ADMIN revoking a pending invite on someone
 *    else's behalf (no token available to them, so it's not required).
 */
async function declineInvitation(caller: Caller, event: MembershipEvent) {
  const workspaceId = requireParam(event.workspaceId, 'workspaceId')
  const invitationId = requireParam(event.invitationId, 'invitationId')

  const { data: invitation } = await client.models.WorkspaceInvitation.get({ id: invitationId })
  if (!invitation || invitation.workspaceId !== workspaceId) {
    throw new MembershipError(404, 'Invitation not found')
  }

  if (invitation.status && invitation.status !== 'PENDING') {
    throw new MembershipError(400, `Invitation is already ${invitation.status.toLowerCase()}`)
  }

  const isInvitee = !!invitation.email && invitation.email.toLowerCase() === caller.email.toLowerCase()

  if (isInvitee) {
    requireTokenMatch(event.token, invitation.token)
  } else {
    await requireRole(
      workspaceId,
      caller.userId,
      ['OWNER', 'ADMIN'],
      'Only the invitee or a workspace owner/admin can decline this invitation'
    )
  }

  await client.models.WorkspaceInvitation.update({ id: invitationId, status: 'DECLINED' })

  return { success: true }
}

async function updateMemberRole(caller: Caller, event: MembershipEvent) {
  const workspaceId = requireParam(event.workspaceId, 'workspaceId')
  const targetUserId = requireParam(event.targetUserId, 'targetUserId')
  const role = event.role
  if (role !== 'ADMIN' && role !== 'MEMBER') {
    throw new MembershipError(400, 'role must be ADMIN or MEMBER')
  }

  await requireRole(workspaceId, caller.userId, ['OWNER'], 'Only workspace owner can change member roles')

  const targetMember = await getMembership(workspaceId, targetUserId)
  if (!targetMember) {
    throw new MembershipError(404, 'Member not found')
  }
  if (targetMember.role === 'OWNER') {
    throw new MembershipError(403, 'Cannot change owner role')
  }

  const { errors } = await client.models.WorkspaceMember.update({ id: targetMember.id, role })
  if (errors) {
    console.error('Failed to update member role:', errors)
    throw new MembershipError(500, 'Failed to update member role')
  }

  if (role === 'ADMIN') {
    await addUserToGroups(targetUserId, [workspaceWriterGroup(workspaceId)])
  } else {
    await removeUserFromGroups(targetUserId, [workspaceWriterGroup(workspaceId)])
  }

  return { success: true }
}

async function removeMember(caller: Caller, event: MembershipEvent) {
  const workspaceId = requireParam(event.workspaceId, 'workspaceId')
  const targetUserId = requireParam(event.targetUserId, 'targetUserId')

  await requireRole(
    workspaceId,
    caller.userId,
    ['OWNER', 'ADMIN'],
    'Only workspace owners and admins can remove members'
  )

  const targetMember = await getMembership(workspaceId, targetUserId)
  if (!targetMember) {
    throw new MembershipError(404, 'Member not found')
  }
  if (targetMember.role === 'OWNER') {
    throw new MembershipError(403, 'Cannot remove workspace owner')
  }

  const { errors } = await client.models.WorkspaceMember.delete({ id: targetMember.id })
  if (errors) {
    console.error('Failed to remove member:', errors)
    throw new MembershipError(500, 'Failed to remove member')
  }

  await removeUserFromGroups(targetUserId, [
    workspaceReaderGroup(workspaceId),
    workspaceWriterGroup(workspaceId),
  ])

  await recomputeMemberCount(workspaceId)

  return { success: true }
}

async function deleteWorkspace(caller: Caller, event: MembershipEvent) {
  const workspaceId = requireParam(event.workspaceId, 'workspaceId')

  const { data: workspace } = await client.models.Workspace.get({ id: workspaceId })
  if (!workspace) {
    throw new MembershipError(404, 'Workspace not found')
  }
  if (workspace.ownerId !== caller.userId) {
    throw new MembershipError(403, 'Only the workspace owner can delete this workspace')
  }
  if (workspace.isPersonal) {
    throw new MembershipError(400, 'Personal workspaces cannot be deleted')
  }

  // Cascade: members, invitations and the subscription row, then the
  // workspace itself, then the Cognito groups.
  const { data: members } = await client.models.WorkspaceMember.list({
    filter: { workspaceId: { eq: workspaceId } },
  })
  await Promise.all((members ?? []).map((member) => client.models.WorkspaceMember.delete({ id: member.id })))

  const { data: invitations } = await client.models.WorkspaceInvitation.list({
    filter: { workspaceId: { eq: workspaceId } },
  })
  await Promise.all(
    (invitations ?? []).map((invitation) => client.models.WorkspaceInvitation.delete({ id: invitation.id }))
  )

  const { data: subscription } = await client.models.WorkspaceSubscription.get({ workspaceId })
  if (subscription) {
    await client.models.WorkspaceSubscription.delete({ workspaceId })
  }

  const { errors } = await client.models.Workspace.delete({ id: workspaceId })
  if (errors) {
    console.error('Failed to delete workspace:', errors)
    throw new MembershipError(500, 'Failed to delete workspace')
  }

  await deleteWorkspaceGroups(workspaceId)

  return { success: true }
}

/**
 * (Re)provision a workspace's Stripe customer + free WorkspaceSubscription
 * row. Normally billing is bootstrapped atomically at workspace creation
 * (here and in post-confirmation); this action is the self-heal used by the
 * billing checkout route when the row is unexpectedly missing — clients hold
 * no write grant on WorkspaceSubscription, so the write MUST happen here.
 */
async function ensureBilling(caller: Caller, event: MembershipEvent) {
  const workspaceId = requireParam(event.workspaceId, 'workspaceId')

  // AUTHORIZATION: only the workspace OWNER manages billing.
  await requireRole(workspaceId, caller.userId, ['OWNER'], 'Only the workspace owner can manage billing')

  const { stripeCustomerId, created } = await ensureWorkspaceBilling({
    workspaceId,
    stripe,
    client,
    customerEmail: caller.email,
    customerName: caller.name,
  })

  return { stripeCustomerId, created }
}
