# Workspaces Layer

Multi-tenant workspace management for the starter kit: workspace creation/switching, team member invitations, role management, and the group-per-workspace authorization model that keeps tenant data isolated. Package name: `@mmshark/workspaces-layer`.

## Table of Contents

- [Overview](#overview)
- [Multi-Tenancy Model](#multi-tenancy-model)
- [Composables](#composables)
- [Components](#components)
- [API Routes](#api-routes)
- [Configuration](#configuration)

## Overview

```
layers/workspaces/
├── components/
│   ├── WorkspaceSwitcher.vue          # Dropdown to switch/create workspaces
│   ├── CreateWorkspaceModal.vue       # Modal form to create a workspace
│   ├── WorkspaceGeneralForm.vue       # Edit name/description/slug for the active workspace
│   ├── WorkspaceMembersList.vue       # Members table with invite/role/remove actions
│   └── InviteWorkspaceMemberModal.vue # Modal form to invite a member by email
├── composables/
│   ├── useWorkspaces.ts               # Workspace list/switch/create state
│   ├── useWorkspace.ts                # Current-workspace helpers
│   ├── useWorkspaceMembers.ts         # Members + invitations for one workspace
│   └── useWorkspaceMembership.ts      # Current user's role in the active workspace
├── server/
│   ├── api/workspaces/                # 11 Nitro API routes (see below)
│   ├── middleware/auth.ts             # Authenticates every /api/workspaces/* request
│   └── utils/workspaceMembership.ts   # Re-export of the amplify-layer invoke helper
├── types/workspaces.ts                # Workspace/WorkspaceMember/WorkspaceInvitation types
└── nuxt.config.ts
```

Peer dependencies (from `layers/workspaces/package.json`): `nuxt@^4.0.0`, `@mmshark/amplify-layer`, `@mmshark/auth-layer`, `@mmshark/billing-layer`, `zod@^4.0.0`.

## Multi-Tenancy Model

Tenant tables (`Workspace`, `WorkspaceMember`, `WorkspaceSubscription`, `WorkspaceInvitation`) are **read-only** for authenticated GraphQL clients (see `apps/backend/amplify/data/resource.ts`). Access and mutation are split across two mechanisms:

- **Reads** are scoped by dynamic Cognito groups, one pair per workspace:
  - `ws:<workspaceId>:members` — every member (OWNER/ADMIN/MEMBER); grants read access to rows whose `readerGroups` field contains this name.
  - `ws:<workspaceId>:admins` — OWNER/ADMIN only; an **admin marker**, not itself a write grant on AppSync. It's metadata the privileged Lambdas use to drive role logic.
- **Writes** (create/update/delete on any tenant table) are never performed by the client. They go exclusively through the `workspace-membership` Lambda (`apps/backend/amplify/functions/workspace-membership/`), invoked via `invokeWorkspaceMembership()` in `layers/amplify/server/utils/workspaceMembership.ts`. That Lambda re-verifies the caller's Cognito access token (`GetUser`) and re-checks OWNER/ADMIN business rules itself — it never trusts the invocation payload's claimed identity.

**Token refresh matters.** Group membership is stamped into a user's Cognito access/ID token at issue time, so any action that changes group membership — creating a workspace, accepting an invitation — is invisible to that user's current session until the token refreshes. `useWorkspaces().createWorkspace()` handles this by calling `fetchAuthSession({ forceRefresh: true })` (client-side only) immediately after the workspace is created, before updating local state. Any new flow that grants a group should follow the same pattern.

## Composables

### `useWorkspaces()`

Global workspace list/selection state (`useState`, shared across components) plus a `current-workspace-id` cookie for persistence across reloads.

- **State**: `workspaces: Workspace[]`, `currentWorkspace` (computed, matches `currentWorkspaceId`), `currentWorkspaceId`, `personalWorkspace` (computed: the caller's own `isPersonal` workspace), `loading`.
- **Methods**:
  - `loadWorkspaces()` — `GET /api/workspaces`, populates `workspaces`, auto-selects the personal workspace (or the first one) if none is selected yet.
  - `createWorkspace(input: CreateWorkspaceInput)` — `POST /api/workspaces`, then force-refreshes the Amplify auth session client-side (see above) before pushing the new workspace into local state and switching to it.
  - `switchWorkspace(workspaceId: string)` — sets `currentWorkspaceId` and persists it to the `current-workspace-id` cookie.

### `useWorkspace()`

Thin helper scoped to the currently selected workspace (built on `useWorkspaces()`).

- `workspace` — alias for `currentWorkspace`.
- `workspaceId` — alias for `currentWorkspaceId`.
- `isOwner` — computed: does `currentUser.userId` match `currentWorkspace.ownerId`.
- `requireWorkspace()` — returns `currentWorkspace.value` or throws a 404 `createError` if none is selected.

### `useWorkspaceMembers(workspaceId: MaybeRef<string | null | undefined>)`

Members + invitations for a specific workspace, built on `useAsyncData` (cached, SSR/hydration-safe, keyed by workspace id).

- **State**: `members: WorkspaceMember[]`, `invitations: WorkspaceInvitation[]`, `loading` (true while either is `pending`).
- **Methods**:
  - `loadMembers()` — refreshes both members and invitations in parallel.
  - `loadInvitations` — alias for the invitations `refresh` function.
  - `inviteMember(input: InviteMemberInput)` — `POST /api/workspaces/:id/members/invite`, then refreshes invitations.
  - `removeMember(userId)` — `DELETE /api/workspaces/:id/members/:userId` with an optimistic local removal, reverted on error.
  - `updateMemberRole(userId, role)` — `PATCH /api/workspaces/:id/members/:userId/role` with an optimistic local role update, reverted on error.

### `useWorkspaceMembership()`

The current user's membership/role in the **active** workspace (`currentWorkspaceId` from `useWorkspaces()`), built on top of `useWorkspaceMembers()`. Used by the entitlements layer to gate permissions.

- `currentMembership` — the `WorkspaceMember` row matching the signed-in user's `userId`, or `null`.
- `currentRole` — that member's `role`, or `null`.
- `isOwner` — true if `currentWorkspace.ownerId` matches the current user, or `currentRole === 'OWNER'`.
- `isAdminOrOwner` — true if `currentRole` is `ADMIN` or `OWNER` (or `isOwner`).
- `loadMembers` — re-exported from `useWorkspaceMembers()` for convenience.

## Components

### `<WorkspaceSwitcher>`

Dropdown menu (`UDropdownMenu`) listing the user's workspaces plus "Create workspace" and "Manage workspaces" (links to `/settings/workspaces`) actions. Loads workspaces on mount via `useWorkspaces().loadWorkspaces()`. Renders `<CreateWorkspaceModal>` internally.

- **Props**: `collapsed?: boolean` — compact icon-only mode (no label, square button).

### `<CreateWorkspaceModal>`

Modal form (name, optional slug, optional description) that calls `useWorkspaces().createWorkspace()` on submit and toasts success/failure.

- **Props**: `modelValue: boolean` (open state).
- **Emits**: `update:modelValue`.

### `<WorkspaceGeneralForm>`

Settings form bound to `useWorkspace().workspace`; submits `PUT /api/workspaces/:id` directly with `{ name, description }`. The `slug` field is displayed but disabled — it is not part of the update payload (the backend only allows updating `name`/`description`; `slug` is immutable after creation).

### `<WorkspaceMembersList>`

Members table (`UTable`) for a workspace: name/avatar, role (editable `USelect` if the viewer can manage roles, otherwise a badge), joined date, and a remove action. Renders `<InviteWorkspaceMemberModal>` and an "Invite Member" button (visible to owners/admins).

- **Props**: `workspaceId: string`.
- Role editing is restricted to OWNER only, to `ADMIN`/`MEMBER` (an invitation or role change can never grant `OWNER`); a row already showing `OWNER` is never editable. Removal is blocked for the owner row and for the viewer's own row.

### `<InviteWorkspaceMemberModal>`

Modal form (email, role select `MEMBER`/`ADMIN`, optional message) that calls `useWorkspaceMembers(workspaceId).inviteMember()` on submit.

- **Props**: `modelValue: boolean`, `workspaceId: string`.
- **Emits**: `update:modelValue`, `invited`.

## API Routes

All routes are gated by `server/middleware/auth.ts`, which runs for every path under `/api/workspaces`, resolves the Amplify auth session, and attaches `event.context.user`/`session`/`userAttributes` (401 if unauthenticated). Routes fall into two groups: **direct reads** (query AppSync with the caller's own userPool-scoped session — safe because tenant tables are readable via the caller's group/owner claims) and **delegated writes** (proxy to the `workspace-membership` Lambda via `invokeWorkspaceMembership()`, because clients hold no write grant on any tenant table).

| Method & Path | Purpose | Auth model |
|---|---|---|
| `GET /api/workspaces` | List all workspaces the caller belongs to (via their `WorkspaceMember` rows, then the matching `Workspace` rows). Supports `limit`/`nextToken` pagination. | Direct read (`getServerUserPoolDataClient` + caller's session). |
| `POST /api/workspaces` | Create a new workspace. | Delegated — `createWorkspace` action. Needs the Lambda's Cognito group provisioning, which the caller's current token can't yet do. |
| `PUT /api/workspaces/:id` | Update a workspace's `name`/`description` (OWNER/ADMIN only). | Delegated — `updateWorkspace` action. |
| `DELETE /api/workspaces/:id` | Delete a workspace (OWNER only; personal workspaces cannot be deleted), cascading members, invitations, subscription, and Cognito groups. | Delegated — `deleteWorkspace` action. |
| `GET /api/workspaces/:id/invitations` | List `PENDING` invitations for a workspace (OWNER/ADMIN only — the route checks the caller's own `WorkspaceMember` row and role before querying). | Direct read. |
| `POST /api/workspaces/:id/invitations/:invitationId/accept` | Accept an invitation. Requires the invitation's `token` (from the emailed link, via query string or body). | Delegated — `acceptInvitation` action. The invitee isn't in any workspace group yet, so their token can't read/write the relevant rows. |
| `POST /api/workspaces/:id/invitations/:invitationId/decline` | Decline an invitation, as the invitee (token required) or a current OWNER/ADMIN revoking it (no token needed). | Delegated — `declineInvitation` action. |
| `GET /api/workspaces/:id/members` | List all members of a workspace (caller must be a member). | Direct read. |
| `POST /api/workspaces/:id/members/invite` | Invite a new member by email + role (OWNER/ADMIN only; role limited to `ADMIN`/`MEMBER`). | Delegated — `createInvitation` action. |
| `DELETE /api/workspaces/:id/members/:userId` | Remove a member (OWNER/ADMIN only; cannot remove the owner). | Delegated — `removeMember` action. Needs Cognito group removal, which the server doesn't hold permissions for directly. |
| `PATCH /api/workspaces/:id/members/:userId/role` | Change a member's role to `ADMIN`/`MEMBER` (OWNER only). | Delegated — `updateMemberRole` action. Needs Cognito `ws:<id>:admins` group add/remove. |

That's 11 routes total. `layers/workspaces/server/utils/workspaceMembership.ts` simply re-exports `getSessionAccessToken`, `invokeWorkspaceMembership`, and `readInvitationToken` from `@mmshark/amplify-layer/server/utils/workspaceMembership` (the shared implementation lives in the amplify layer so the billing layer can use it too, without a dependency cycle).

## Configuration

Peer dependencies (must be present in the consuming app's workspace, per `layers/workspaces/package.json`):

```json
{
  "nuxt": "^4.0.0",
  "@mmshark/amplify-layer": "workspace:*",
  "@mmshark/auth-layer": "workspace:*",
  "@mmshark/billing-layer": "workspace:*",
  "zod": "^4.0.0"
}
```

No environment variables are required directly by this layer — all Amplify/Stripe configuration is resolved through `@mmshark/amplify-layer` (`amplify_outputs.json`, including `custom.workspaceMembershipFunctionName` used by the invoke helper) and `@mmshark/billing-layer`.
