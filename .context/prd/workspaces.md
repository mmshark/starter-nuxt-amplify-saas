# PRD: Workspaces (Multi-tenancy)

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/workspaces.md

## Purpose & scope

Multi-tenant workspace management for the starter: workspace CRUD, workspace switching, team
membership with roles, and an email-based invitation flow. Builds on Auth (Cognito identity),
Billing (per-workspace subscription) and Entitlements (plan/role gating).

**In scope**: workspace lifecycle (create/update/delete/transfer), personal workspace auto-creation,
switching with persistence, invitations (create/send/accept/decline/revoke), member role management,
workspace-scoped data isolation.

**Out of scope**: authentication (see [auth.md](./auth.md)), subscription management (see
[billing.md](./billing.md)), permission catalog definitions (see [entitlements.md](./entitlements.md)),
file storage, realtime collaboration.

## Requirements

### Functional (target)

| # | Requirement |
|---|---|
| F1 | Authenticated user can create workspaces (name, auto slug, description) and becomes `OWNER` |
| F2 | A personal workspace is auto-created for every new user at signup |
| F3 | User can switch workspaces; selection persists across sessions and drives all workspace-scoped API calls |
| F4 | `OWNER`/`ADMIN` can invite by email with role `ADMIN` or `MEMBER` (an invitation can never grant `OWNER`); invitee receives an email with an acceptance link |
| F5 | Invitee can view pending invitations and accept/decline from a dedicated page; token is single-use and expires |
| F6 | `OWNER`/`ADMIN` can revoke a pending invitation from the members settings page |
| F7 | `OWNER` can change member roles (`ADMIN` ↔ `MEMBER`) and remove members; last owner cannot be removed |
| F8 | `OWNER` can transfer ownership to another member |
| F9 | `OWNER` can delete a workspace from the UI (cascade: members, invitations, subscription, Cognito groups) |
| F10 | Workspace data is only readable/writable by members, enforced server-side |
| F11 | Plan-based limits on workspaces per user and members per workspace, enforced at create/invite time |

### Data model (implemented — apps/backend/amplify/data/resource.ts)

| Model | Key fields | Notes |
|---|---|---|
| `Workspace` | name, slug, description, ownerId, isPersonal, readerGroups | hasMany members/invitations, hasOne subscription |
| `WorkspaceMember` | workspaceId, userId, email, name, role, readerGroups | role: `OWNER \| ADMIN \| MEMBER` |
| `WorkspaceInvitation` | workspaceId, email, role, invitedBy, token, expiresAt, status, readerGroups | status: `PENDING \| ACCEPTED \| DECLINED \| EXPIRED` (`EXPIRED` is set lazily by the membership Lambda when acceptance is attempted after `expiresAt`; no proactive purge — see Open issues) |
| `WorkspaceSubscription` | workspaceId, planId, Stripe fields, readerGroups | billing link (see [billing.md](./billing.md)) |

Client types mirror this in `layers/workspaces/types/workspaces.ts` (`WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'`).

### Authorization model (implemented — "group-per-workspace")

- Two Cognito groups per workspace: `ws:<id>:members` and `ws:<id>:admins`.
- Tenant tables are **read-only** for clients via `allow.groupsDefinedIn('readerGroups')`;
  `readerGroups` is set only by Lambda code, never by clients.
- **All writes** go through the `workspace-membership` Lambda
  (`apps/backend/amplify/functions/workspace-membership/handler.ts`), which verifies the caller's
  Cognito access token via `GetUser` and dispatches 9 actions: `createWorkspace`, `updateWorkspace`,
  `createInvitation`, `acceptInvitation`, `declineInvitation`, `updateMemberRole`, `removeMember`,
  `deleteWorkspace` (cascade + group deletion), `ensureBilling`.
- Personal workspace + groups are created by the post-confirmation trigger
  (`apps/backend/amplify/auth/post-confirmation/handler.ts`); `ensureBilling` is the self-heal path.
- Nitro routes invoke the Lambda through `layers/workspaces/server/utils/workspaceMembership.ts`;
  route auth via `layers/workspaces/server/middleware/auth.ts`.

### API (implemented — layers/workspaces/server/api/workspaces/)

| Endpoint | File |
|---|---|
| `GET /api/workspaces` | `index.get.ts` |
| `POST /api/workspaces` | `index.post.ts` |
| `PUT /api/workspaces/:id` | `[id]/index.put.ts` |
| `DELETE /api/workspaces/:id` | `[id]/index.delete.ts` |
| `GET /api/workspaces/:id/members` | `[id]/members/index.get.ts` |
| `POST /api/workspaces/:id/members/invite` | `[id]/members/invite.post.ts` |
| `PATCH /api/workspaces/:id/members/:userId/role` | `[id]/members/[userId]/role.patch.ts` |
| `DELETE /api/workspaces/:id/members/:userId` | `[id]/members/[userId].delete.ts` |
| `GET /api/workspaces/:id/invitations` | `[id]/invitations.get.ts` |
| `POST /api/workspaces/:id/invitations/:invitationId/accept` | `[id]/invitations/[invitationId]/accept.post.ts` |
| `POST /api/workspaces/:id/invitations/:invitationId/decline` | `[id]/invitations/[invitationId]/decline.post.ts` |

### Client layer (implemented — layers/workspaces/)

- **Composables**: `useWorkspaces` (list, create, switch; persists selection in the
  `current-workspace-id` cookie), `useWorkspace` (current context, `isOwner`), `useWorkspaceMembers`
  (members/invitations, invite/remove/role change), `useWorkspaceMembership` (current user's role;
  consumed by the entitlements layer).
- **Components**: `WorkspaceSwitcher.vue`, `CreateWorkspaceModal.vue`, `WorkspaceGeneralForm.vue`,
  `WorkspaceMembersList.vue`, `InviteWorkspaceMemberModal.vue`.
- **Consuming pages**: `layers/saas/pages/settings/workspaces.vue`,
  `layers/saas/pages/settings/members.vue`.

## Current status

Audit 2026-07-08 (area `workspaces`): implementation 3/5, quality 4/5. The backend tenancy model is
solid; the gaps are product-facing last-mile flows.

| Capability | Status | Evidence |
|---|---|---|
| Data model + group-per-workspace isolation | Implemented | `apps/backend/amplify/data/resource.ts` |
| Membership Lambda (9 actions, token-verified) | Implemented | `apps/backend/amplify/functions/workspace-membership/handler.ts` |
| Personal workspace auto-creation (F2) | Implemented | `apps/backend/amplify/auth/post-confirmation/handler.ts` |
| Workspace create/update, switching (F1, F3) | Implemented | `layers/workspaces/composables/useWorkspaces.ts`, `WorkspaceGeneralForm.vue` |
| Member list, role change, removal UI (F7) | Implemented | `layers/workspaces/components/WorkspaceMembersList.vue` |
| Invitation records + accept/decline **endpoints** | Implemented | `[id]/invitations/[invitationId]/accept.post.ts`, `decline.post.ts` |
| Invitation **email** (F4) | **Missing** | Zero email integration in the repo (no SES/Resend/nodemailer); token lives only in DynamoDB; UI shows no copyable link |
| Invitation acceptance **page** / invitee pending view (F5) | **Missing** | No page consumes accept/decline; no "my pending invitations" endpoint for the invitee — flow unusable end-to-end |
| Invitation revocation UI (F6) | **Missing** | No revoke button in `layers/saas/pages/settings/members.vue` (backend supports it via decline as OWNER/ADMIN) |
| Ownership transfer (F8) | **Missing** | Explicitly not implemented (`WorkspaceMembersList.vue`); `updateMemberRole` only accepts `ADMIN\|MEMBER` |
| Workspace deletion UI (F9) | **Missing** | `[id]/index.delete.ts` exists but no UI consumer calls it |
| Plan-based limits (F11) | **Missing** | No limit checks in `index.post.ts`, `invite.post.ts`, or the Lambda |
| Route middlewares (`workspace`, `workspaceOwner`, …) claimed by the old PRD | **Never existed** | `layers/workspaces/` has no `middleware/` directory |
| JWT token utils (`generateInviteToken` etc.) claimed by the old PRD | **Never existed** | No `layers/workspaces/utils/`; tokens are handled inside the Lambda |
| E2E test suite claimed by the old PRD | **Missing** | Only `layers/workspaces/composables/__tests__/useWorkspaces.test.ts` exists |

## Open issues & risks

- **Cookie name mismatch (verified bug)**: `useWorkspaces` persists selection in cookie
  `current-workspace-id` (`layers/workspaces/composables/useWorkspaces.ts`) but
  `layers/entitlements/server/utils/getWorkspaceContext.ts` reads `currentWorkspaceId`, so the
  cookie fallback never matches and entitlement checks without an explicit `workspaceIdOverride`
  resolve to free plan / `user` role. Fail-closed (not a security hole) but breaks gating. Fix: E02.
- **Invitation token exposure**: `GET /api/workspaces/:id/invitations` returns the raw invitation
  token to OWNER/ADMIN callers (`[id]/invitations.get.ts`); once emails exist, tokens should not be
  listable by parties other than the invitee.
- **External avatar dependency**: `WorkspaceSwitcher.vue` fetches avatars from `ui-avatars.com`
  (privacy leak of workspace names, external runtime dependency). Cleanup: E03.
- **No plan limits**: any user can create unlimited workspaces and invite unlimited members
  regardless of plan — monetization gating depends on E06 (entitlements wiring) plus limit checks.
- **Invitation cleanup**: expired invitations are never purged (no TTL/scheduled job; candidate for
  E17 background-jobs).

## Related

- [Roadmap](../roadmaps/20260711-saas-boilerplate-productization.md) — gaps are covered by **E02** (cookie fix), **E03** (avatar/template
  cleanup), **E04 transactional-email** (invitation email + acceptance page + revocation UI),
  **E08 workspace-lifecycle** (ownership transfer, deletion UI, invitee pending view), **E06**
  (entitlements wiring for limits).
- Sibling PRDs: [auth.md](./auth.md), [billing.md](./billing.md), [entitlements.md](./entitlements.md)
- Patterns: [api-server.md](../patterns/api-server.md), [composables.md](../patterns/composables.md)
- Layer README: `layers/workspaces/README.md`
