# PRD: Workspaces Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
  - [2.1 Create Workspace Flow](#21-create-workspace-flow)
  - [2.2 Switch Workspace Flow](#22-switch-workspace-flow)
  - [2.3 Invite Team Member Flow](#23-invite-team-member-flow)
  - [2.4 Accept Invitation Flow](#24-accept-invitation-flow)
  - [2.5 Manage Team Member Flow](#25-manage-team-member-flow)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Data Model](#31-data-model)
  - [3.2 Composables](#32-composables)
  - [3.3 Components](#33-components)
  - [3.4 Middlewares](#34-middlewares)
  - [3.5 Utilities](#35-utilities)
  - [3.6 Server Utilities](#36-server-utilities)
  - [3.7 tRPC Procedures](#37-trpc-procedures)
- [4. Testing](#4-testing)
  - [4.1 Unit Tests (Minimal)](#41-unit-tests-minimal)
  - [4.2 E2E Tests (Primary)](#42-e2e-tests-primary)
- [5. Implementation](#5-implementation)
  - [5.1 Layer Structure](#51-layer-structure)
  - [5.2 Definition of Done](#52-definition-of-done)
  - [5.3 Plan](#53-plan)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1 Security](#61-security)
  - [6.2 Performance](#62-performance)
  - [6.3 Scalability](#63-scalability)

## 1. Overview

### 1.1 Purpose

The Workspaces Layer provides multi-tenant workspace management for a Nuxt 4-based SaaS application. It enables team collaboration by allowing users to create workspaces, invite team members, assign roles, and manage workspace-scoped data. This layer builds on top of Auth, Billing, and Entitlements layers to provide complete multi-tenant functionality with role-based access control at the workspace level.

### 1.2 Scope

**Includes**:
- Workspace creation, updating, and deletion
- Workspace switching with context persistence
- Team member invitation system with email notifications
- Team member role management (Owner, Admin, Member)
- Workspace-scoped data isolation and access control
- Personal workspace for individual user
- Workspace settings and metadata management∫
- SSR-compatible workspace context with universal API
- Integration with Auth, Billing, and Entitlements layers
- Workspace limits based on subscription plan

**Excludes**:
- User authentication (handled by Auth Layer)
- Subscription and billing management (handled by Billing Layer)
- Global permission definitions (handled by Entitlements Layer)
- Workspace-specific feature development (handled by consuming applications)
- File storage and asset management (handled by Amplify Layer)
- Real-time collaboration features (future enhancement)

### 1.3 Key Requirements

**Technical**:
- Workspace context persistence across sessions
- GraphQL integration for workspace data (DynamoDB)
- Email notification system for invitations
- Invitation token generation and validation
- Role-based access control at workspace level
- Data isolation per workspace with validation

**Functional**:
- User can create unlimited workspaces (or subject to plan limits)
- User can switch between workspaces seamlessly
- User can invite team members via email
- Invited user can accept/decline invitation
- Workspace owner can manage team member roles
- Workspace owner can remove team members
- Workspace data only accessible to members
- Personal workspace created automatically for new users

**Multi-Tenancy Model**:
- **Personal Workspace**: Individual workspace for each user (auto-created)
- **Team Workspaces**: Shared workspaces with multiple members
- **Workspace Roles**: Owner (creator), Admin (elevated permissions), Member (basic access)

### 1.4 Artifacts

**Data Models**:
- `Workspace` - Workspace entity (id, name, slug, description, ownerId, timestamps, memberCount, isPersonal) stored in DynamoDB
- `WorkspaceMember` - Team member entity (workspaceId, userId, email, name, role, joinedAt) stored in DynamoDB
- `WorkspaceInvitation` - Pending invitation entity (id, workspaceId, email, role, inviter details, token, expiry) stored in DynamoDB

**Types**:
- `WorkspaceState` - Reactive workspace state (non-persistent)
- `WorkspaceRole` - Workspace-level role TypeScript enum ('owner' | 'admin' | 'member')

**Composables**:
- `useWorkspaces()` - Universal workspace management (client & server)
- `useWorkspace()` - Current workspace context and operations
- `useWorkspaceMembers()` - Team member management

**Components**:
- `<WorkspaceSwitcher>` - Workspace selection dropdown
- `<CreateWorkspaceModal>` - Workspace creation dialog
- `<WorkspaceSettings>` - Workspace settings panel
- `<TeamMembersList>` - Display and manage team members
- `<InviteTeamMemberModal>` - Team member invitation dialog
- `<PendingInvitations>` - Display and manage pending invitations
- `<WorkspaceRoleBadge>` - Visual role indicator

**Middlewares**:
- `workspace` (client & server) - Ensure workspace context is loaded
- `workspaceOwner` (client & server) - Restrict to workspace owners
- `workspaceMember` (client & server) - Restrict to workspace members

**Server Utilities**:
- `requireWorkspace(event)` - Get current workspace or throw 404
- `requireWorkspaceMember(event, workspaceId)` - Validate membership or throw 403
- `requireWorkspaceOwner(event, workspaceId)` - Validate ownership or throw 403
- `requireWorkspaceRole(event, workspaceId, role)` - Validate role or throw 403
- `withWorkspace(handler)` - HOF wrapper for workspace-scoped endpoints

**tRPC Procedures** (`layers/workspaces/server/trpc/routers/workspaces.ts`):
- `workspaces.list` (query) - List user's workspaces
- `workspaces.get` (query) - Get workspace details with members
- `workspaces.create` (mutation) - Create new workspace
- `workspaces.update` (mutation) - Update workspace settings
- `workspaces.delete` (mutation) - Delete workspace
- `workspaces.switch` (mutation) - Switch active workspace
- `workspaces.inviteMember` (mutation) - Send team member invitation
- `workspaces.listInvitations` (query) - List pending invitations
- `workspaces.acceptInvitation` (mutation) - Accept workspace invitation
- `workspaces.rejectInvitation` (mutation) - Reject workspace invitation
- `workspaces.updateMemberRole` (mutation) - Update team member role
- `workspaces.removeMember` (mutation) - Remove team member
- `workspaces.listMembers` (query) - List workspace members

**Utilities**:
- `generateInviteToken()` - Create secure invitation token
- `validateInviteToken()` - Validate and decode invitation token
- `getWorkspaceSlug()` - Generate URL-safe workspace slug


## 2. User Flows

### 2.1 Create Workspace Flow

**Actors**: Authenticated User

**Preconditions**:
- User is authenticated
- User has not exceeded workspace limit for their plan

**Flow**:
1. User clicks "Create Workspace" button in workspace switcher
2. System displays workspace creation modal
3. User enters workspace details:
   - Workspace name (required)
   - Workspace slug (auto-generated, editable)
   - Description (optional)
4. User clicks "Create Workspace" button
5. System validates input:
   - Name is not empty
   - Slug is unique and URL-safe
   - User has not exceeded plan limit
6. System creates workspace in database (GraphQL mutation)
7. System adds user as workspace owner
8. System switches to new workspace automatically
9. System displays success message
10. User sees new workspace in workspace switcher

**Success Criteria**:
- Workspace created successfully
- User is workspace owner
- Workspace becomes active workspace
- Workspace appears in user's workspace list

**Error Cases**:
- Slug already exists: Show error, suggest alternative
- Plan limit exceeded: Show upgrade prompt
- Network error: Show retry option

### 2.2 Switch Workspace Flow

**Actors**: Authenticated User (Workspace Member)

**Preconditions**:
- User is authenticated
- User is member of multiple workspaces

**Flow**:
1. User opens workspace switcher dropdown
2. System displays list of user's workspaces with:
   - Workspace name
   - User's role in workspace
   - Current workspace indicator
3. User clicks on different workspace
4. System switches workspace context:
   - Updates current workspace ID in state
   - Persists selection to cookie/localStorage
   - Refreshes workspace-scoped data
5. System navigates to workspace dashboard
6. Page re-renders with new workspace context
7. All subsequent API calls use new workspace context

**Success Criteria**:
- Workspace switched successfully
- UI updates to reflect new workspace
- Workspace context persisted across page reloads
- Workspace-scoped data loads correctly

### 2.3 Invite Team Member Flow

**Actors**: Workspace Owner/Admin, Invited User (email recipient)

**Preconditions**:
- User is workspace owner or admin
- User has not exceeded team member limit (plan-based)

**Flow**:
1. User navigates to workspace settings → Team Members
2. User clicks "Invite Team Member" button
3. System displays invitation modal
4. User enters invitation details:
   - Email address (required)
   - Role selection (Admin or Member)
   - Personal message (optional)
5. User clicks "Send Invitation" button
6. System validates:
   - Email format is valid
   - User not already in workspace
   - No pending invitation for this email
   - Team limit not exceeded
7. System creates invitation record in database
8. System generates secure invitation token (JWT)
9. System sends invitation email with:
   - Workspace name
   - Inviter name
   - Role being offered
   - Invitation link with token
   - Personal message (if provided)
10. System displays success message
11. Invited user receives email
12. Invitation appears in "Pending Invitations" list

**Success Criteria**:
- Invitation created successfully
- Email sent to recipient
- Invitation appears in pending list
- Token expires after 7 days

**Error Cases**:
- Email already a member: Show error
- Pending invitation exists: Show error with resend option
- Team limit exceeded: Show upgrade prompt
- Email sending fails: Queue for retry

### 2.4 Accept Invitation Flow

**Actors**: Invited User

**Preconditions**:
- User has received invitation email
- Invitation token is valid and not expired
- User has account (or creates one)

**Flow**:
1. User clicks invitation link in email
2. **If not logged in**:
   - System redirects to login page with return URL
   - User logs in or signs up
   - System redirects back to invitation acceptance
3. **If logged in**:
   - System validates invitation token
   - System displays invitation details:
     - Workspace name
     - Inviter name
     - Role being offered
4. User clicks "Accept Invitation" button
5. System processes acceptance:
   - Adds user to workspace with specified role
   - Deletes invitation record
   - Sends notification to workspace owner
6. System switches to new workspace
7. System displays welcome message
8. User sees new workspace in workspace list

**Success Criteria**:
- User successfully added to workspace
- User has correct role assigned
- Workspace appears in user's list
- Invitation removed from pending list
- Inviter notified of acceptance

**Error Cases**:
- Token expired: Show error, offer to request new invitation
- Token invalid: Show error
- Workspace deleted: Show error
- Already a member: Redirect to workspace

### 2.5 Manage Team Member Flow

**Actors**: Workspace Owner/Admin

**Preconditions**:
- User is workspace owner or admin
- Workspace has team members

**Flow**:

**Update Member Role**:
1. User navigates to workspace settings → Team Members
2. User clicks on member's role dropdown
3. User selects new role (Member, Admin)
4. System validates:
   - User has permission (owner can change all, admin can change members only)
   - Cannot demote last owner
5. System updates member role in database
6. System displays success message
7. Target member sees updated permissions on next action

**Remove Member**:
1. User clicks "Remove" button next to member
2. System displays confirmation dialog
3. User confirms removal
4. System validates:
   - User has permission
   - Cannot remove last owner
   - Cannot remove self
5. System removes member from workspace
6. System sends notification to removed member
7. Member list updates
8. Removed member no longer sees workspace in their list

**Success Criteria**:
- Role updates reflected immediately
- Member removals processed successfully
- Appropriate notifications sent
- Permission changes enforced

**Error Cases**:
- Removing last owner: Show error
- Insufficient permissions: Show error
- Network error: Show retry option


## 3. Technical Specifications

### 3.1 Data Models

#### 3.1.1 GraphQL Schema

**Location**: Backend Amplify schema (`apps/backend/amplify/data/resource.ts`)

```typescript
const schema = a.schema({
  WorkspaceRole: a.enum(['OWNER', 'ADMIN', 'MEMBER']),

  Workspace: a.model({
    name: a.string().required(),
    slug: a.string().required(),
    description: a.string(),
    ownerId: a.string().required(),
    isPersonal: a.boolean().default(false),
    memberCount: a.integer().default(1),
    members: a.hasMany('WorkspaceMember', 'workspaceId'),
    invitations: a.hasMany('WorkspaceInvitation', 'workspaceId'),
    subscription: a.hasOne('WorkspaceSubscription', 'workspaceId'), // Link to subscription
  })
    .authorization([
      a.allow.owner().to(['read', 'update', 'delete']),
      a.allow.custom(),
    ])
    .secondaryIndexes((index) => [
      index('slug'),
      index('ownerId'),
    ]),

  WorkspaceMember: a.model({
    workspaceId: a.id().required(),
    workspace: a.belongsTo('Workspace', 'workspaceId'),
    userId: a.string().required(),
    email: a.email().required(),
    name: a.string(),
    role: a.ref('WorkspaceRole').required(),
    joinedAt: a.datetime().required(),
  })
    .authorization([
      a.allow.custom(),
    ])
    .secondaryIndexes((index) => [
      index('workspaceId'),
      index('userId'),
    ]),

  // See [Workspaces Implementation Plan](../plan/workspaces.md)
  WorkspaceInvitation: a.model({
    workspaceId: a.id().required(),
    workspace: a.belongsTo('Workspace', 'workspaceId'),
    email: a.email().required(),
    role: a.ref('WorkspaceRole').required(),
    invitedBy: a.string().required(),
    inviterName: a.string(),
    token: a.string().required(),
    expiresAt: a.datetime().required(),
    message: a.string(),
  })
    .authorization([
      a.allow.custom(),
    ])
    .secondaryIndexes((index) => [
      index('workspaceId'),
      index('email'),
    ]),
});
```

### 3.2 Types

#### 3.2.1 Core Types

**Location**: `layers/workspaces/types/workspaces.ts`

**Type Definitions**:
- `WorkspaceRole`: 'owner' | 'admin' | 'member'
- `Workspace`: Entity with id, name, slug, description, ownerId, timestamps, memberCount, isPersonal
- `WorkspaceMember`: Member with workspaceId, userId, email, name, role, joinedAt
- `WorkspaceInvitation`: Invitation with id, workspaceId, email, role, inviter details, token, expiry

**State Interfaces**:
- `WorkspacesState`: Reactive state with workspaces array, currentWorkspace, members, invitations, loading, error
- `CreateWorkspaceInput`: name (required), slug (optional), description (optional)
- `UpdateWorkspaceInput`: name, slug, description (all optional)
- `InviteMemberInput`: workspaceId, email, role, message (optional)

**Plan Limits**:
- Free: 1 workspace, 1 member
- Pro: 5 workspaces, 10 members
- Enterprise: Unlimited workspaces and members

### 3.3 Composables

#### 3.2.1 `useWorkspaces()`

**Location**: `layers/workspaces/composables/useWorkspaces.ts`

**Purpose**: Manage user's workspaces list and current workspace

**API**:
- **State**: workspaces, currentWorkspace, personalWorkspace, loading, error
- **Operations**: createWorkspace(), switchWorkspace(), updateWorkspace(), deleteWorkspace()
- **Queries**: getWorkspace(), canCreateWorkspace(), getWorkspaceLimit()
- **Methods**: refresh()

**Integration**: Depends on useUser() (Auth Layer), useEntitlements() (Entitlements Layer for plan limits)

#### 3.2.2 `useWorkspace()`

**Location**: `layers/workspaces/composables/useWorkspace.ts`

**Purpose**: Current workspace context and operations

**API**:
- **State**: workspace, workspaceId, workspaceName, isOwner
- **Methods**: requireWorkspace()

#### 3.2.3 `useWorkspaceMembers()`

**Location**: `layers/workspaces/composables/useWorkspaceMembers.ts`

**Purpose**: Team member management for current workspace

**API**:
- **State**: members, invitations, loading, error
- **Operations**: inviteMember(), acceptInvitation(), rejectInvitation(), updateMemberRole(), removeMember()
- **Methods**: loadMembers(), loadInvitations()

### 3.4 Components

#### 3.3.1 `<WorkspaceSwitcher>`

**Location**: `layers/workspaces/components/WorkspaceSwitcher.vue`

**Purpose**: Dropdown for switching between workspaces
**Features**: Displays workspace list with avatars, current workspace indicator, create workspace and settings options

#### 3.3.2 `<CreateWorkspaceModal>`

**Location**: `layers/workspaces/components/CreateWorkspaceModal.vue`

**Purpose**: Modal for creating new workspace
**Props**: modelValue (v-model for open state)
**Features**: Name input, auto-generated slug (editable), description textarea, validation

#### 3.3.3 `<TeamMembersList>`

**Location**: `layers/workspaces/components/TeamMembersList.vue`

**Purpose**: Display and manage workspace team members
**Props**: workspaceId (required)
**Features**: Member table with role management, invite button, role dropdowns for owners, remove functionality

### 3.5 Middlewares

#### 3.4.1 `workspace` Middleware

**Location**: `layers/workspaces/middleware/workspace.ts`

**Purpose**: Ensure workspace context is loaded
**Behavior**: Loads workspaces if not loaded, redirects to /onboarding if no current workspace

#### 3.4.2 `workspaceOwner` Middleware

**Location**: `layers/workspaces/middleware/workspaceOwner.ts`

**Purpose**: Restrict routes to workspace owners
**Behavior**: Redirects to /dashboard with error query if user is not workspace owner

#### 3.4.3 `workspaceMember` Middleware

**Location**: `layers/workspaces/middleware/workspaceMember.ts`

**Purpose**: Restrict routes to workspace members
**Behavior**: Server-side validates membership, client-side primarily for UX

### 3.6 Server Utilities

#### 3.6.1 `requireWorkspace()`

**Location**: `layers/workspaces/server/utils/requireWorkspace.ts`

**Purpose**: Get current workspace or throw 404
**Signature**: requireWorkspace(event: H3Event): Promise<Workspace>

#### 3.6.2 `requireWorkspaceMember()`

**Location**: `layers/workspaces/server/utils/requireWorkspaceMember.ts`

**Purpose**: Validate membership or throw 403
**Signature**: requireWorkspaceMember(event: H3Event, workspaceId: string): Promise<void>

#### 3.6.3 `requireWorkspaceOwner()`

**Location**: `layers/workspaces/server/utils/requireWorkspaceOwner.ts`

**Purpose**: Validate ownership or throw 403
**Signature**: requireWorkspaceOwner(event: H3Event, workspaceId: string): Promise<void>

### 3.7 tRPC Procedures

**Location**: `layers/workspaces/server/trpc/routers/workspaces.ts`

**Procedures**:
- `workspaces.list` (query): List user's workspaces
- `workspaces.get` (query): Get workspace details with members
- `workspaces.create` (mutation): Create new workspace
- `workspaces.update` (mutation): Update workspace settings
- `workspaces.delete` (mutation): Delete workspace
- `workspaces.switch` (mutation): Switch active workspace
- `workspaces.inviteMember` (mutation): Send team member invitation
- `workspaces.listInvitations` (query): List pending invitations
- `workspaces.acceptInvitation` (mutation): Accept workspace invitation
- `workspaces.rejectInvitation` (mutation): Reject workspace invitation
- `workspaces.updateMemberRole` (mutation): Update team member role
- `workspaces.removeMember` (mutation): Remove team member
- `workspaces.listMembers` (query): List workspace members

### 3.8 Utilities

#### 3.8.1 `generateInviteToken()`

**Location**: `layers/workspaces/utils/generateInviteToken.ts`

**Purpose**: Create secure invitation token using JWT (HS256, 7-day expiry)
**Signature**: generateInviteToken(payload): Promise<string>

#### 3.8.2 `validateInviteToken()`

**Location**: `layers/workspaces/utils/validateInviteToken.ts`

**Purpose**: Validate and decode invitation token
**Signature**: validateInviteToken(token: string): Promise<any>

#### 3.8.3 `getWorkspaceSlug()`

**Location**: `layers/workspaces/utils/getWorkspaceSlug.ts`

**Purpose**: Generate URL-safe workspace slug from name
**Signature**: getWorkspaceSlug(name: string): string


## 4. Testing

### 4.1 Unit Tests (Minimal)

**Scope**: Core business logic for workspace operations

**Test Cases**:
- Workspace slug generation works correctly
- Invitation token generation and validation
- Workspace limit validation per plan
- Member role hierarchy validation

**Tools**: Vitest

### 4.2 E2E Tests (Primary)

**Scope**: End-to-end user flows for workspace management

**Test Cases**:
1. **Workspace Creation Flow**: Create workspace, appears in list, auto-switch, plan limit enforcement
2. **Workspace Switching Flow**: Switch between workspaces, context persistence, data isolation
3. **Team Invitation Flow**: Owner invite, email sent, accept invitation, correct role assignment
4. **Team Management Flow**: Update roles, remove members, role restrictions, last owner protection

**Tools**: Playwright


## 5. Implementation

### 5.1 Layer Structure

```
layers/workspaces/
├── components/
│   ├── WorkspaceSwitcher.vue
│   ├── CreateWorkspaceModal.vue
│   ├── WorkspaceSettings.vue
│   ├── TeamMembersList.vue
│   ├── InviteTeamMemberModal.vue
│   ├── PendingInvitations.vue
│   └── WorkspaceRoleBadge.vue
├── composables/
│   ├── useWorkspaces.ts
│   ├── useWorkspace.ts
│   └── useWorkspaceMembers.ts
├── middleware/
│   ├── workspace.ts
│   ├── workspaceOwner.ts
│   └── workspaceMember.ts
├── server/
│   ├── trpc/
│   │   └── routers/
│   │       └── workspaces.ts
│   └── utils/
│       ├── requireWorkspace.ts
│       ├── requireWorkspaceMember.ts
│       ├── requireWorkspaceOwner.ts
│       └── withWorkspace.ts
├── types/
│   └── workspaces.ts
├── utils/
│   ├── generateInviteToken.ts
│   ├── validateInviteToken.ts
│   └── getWorkspaceSlug.ts
├── nuxt.config.ts
├── package.json
└── README.md
```

### 5.2 Definition of Done



#### 3.3.3 `<TeamMembersList>`

**Location**: `layers/workspaces/components/TeamMembersList.vue`

**Purpose**: Display and manage workspace team members.

```vue
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Team Members</h3>
      <UButton
        v-if="canInvite"
        icon="i-heroicons-user-plus"
        @click="showInviteModal = true"
      >
        Invite Member
      </UButton>
    </div>

    <UTable
      :rows="members"
      :columns="columns"
      :loading="loading"
    >
      <template #name-data="{ row }">
        <div class="flex items-center gap-2">
          <UAvatar :text="row.name.charAt(0)" size="sm" />
          <div>
            <p class="font-medium">{{ row.name }}</p>
            <p class="text-sm text-gray-500">{{ row.email }}</p>
          </div>
        </div>
      </template>

      <template #role-data="{ row }">
        <USelect
          v-if="canManageRole(row)"
          v-model="row.role"
          :options="roleOptions"
          @change="updateRole(row)"
        />
        <WorkspaceRoleBadge v-else :role="row.role" />
      </template>

      <template #actions-data="{ row }">
        <UButton
          v-if="canRemove(row)"
          icon="i-heroicons-trash"
          color="red"
          variant="ghost"
          size="sm"
          @click="handleRemove(row)"
        >
          Remove
        </UButton>
      </template>
    </UTable>

    <InviteTeamMemberModal
      v-model="showInviteModal"
      :workspace-id="workspaceId"
      @invited="loadMembers"
    />
  </div>
</template>

<script setup lang="ts">
import type { WorkspaceMember } from '../types'

const props = defineProps<{
  workspaceId: string
}>()

const { members, loading, updateMemberRole, removeMember, loadMembers } = useWorkspaceMembers(props.workspaceId)
const { isOwner } = useWorkspace()
const { user } = useUser()

const showInviteModal = ref(false)

const columns = [
  { key: 'name', label: 'Member' },
  { key: 'role', label: 'Role' },
  { key: 'joinedAt', label: 'Joined' },
  { key: 'actions', label: '' }
]

const roleOptions = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' }
]

const canInvite = computed(() => {
  return isOwner.value || members.value.some(m =>
    m.userId === user.value?.id && m.role === 'admin'
  )
})

const canManageRole = (member: WorkspaceMember) => {
  if (member.role === 'owner') return false
  return isOwner.value
}

const canRemove = (member: WorkspaceMember) => {
  if (member.userId === user.value?.id) return false
  if (member.role === 'owner') return false
  return isOwner.value
}

const updateRole = async (member: WorkspaceMember) => {
  try {
    await updateMemberRole(member.userId, member.role)
  } catch (error) {
    console.error('Failed to update role:', error)
  }
}

const handleRemove = async (member: WorkspaceMember) => {
  if (!confirm(`Remove ${member.name} from workspace?`)) return

  try {
    await removeMember(member.userId)
  } catch (error) {
    console.error('Failed to remove member:', error)
  }
}
</script>
```

## 5. Implementation

### 5.1 Layer Structure

```
layers/workspaces/
├── components/
│   ├── WorkspaceSwitcher.vue
│   ├── CreateWorkspaceModal.vue
│   ├── WorkspaceSettings.vue
│   ├── TeamMembersList.vue
│   ├── InviteTeamMemberModal.vue
│   ├── PendingInvitations.vue
│   └── WorkspaceRoleBadge.vue
├── composables/
│   ├── useWorkspaces.ts
│   ├── useWorkspace.ts
│   └── useWorkspaceMembers.ts
├── middleware/
│   ├── workspace.ts
│   ├── workspaceOwner.ts
│   └── workspaceMember.ts
├── server/
│   ├── trpc/
│   │   └── routers/
│   │       └── workspaces.ts         # tRPC workspaces router
│   └── utils/
│       ├── requireWorkspace.ts
│       ├── requireWorkspaceMember.ts
│       ├── requireWorkspaceOwner.ts
│       ├── requireWorkspaceRole.ts
│       └── withWorkspace.ts
├── types/
│   └── workspaces.ts                 # TypeScript type definitions
├── utils/
│   ├── generateInviteToken.ts
│   ├── validateInviteToken.ts
│   └── getWorkspaceSlug.ts
├── tests/
│   ├── unit/
│   │   ├── workspace-limits.test.ts
│   │   └── invite-token.test.ts
│   └── e2e/
│       ├── workspace-creation.spec.ts
│       ├── workspace-switching.spec.ts
│       ├── team-invitations.spec.ts
│       └── team-management.spec.ts
├── nuxt.config.ts
├── package.json
└── README.md
```

### 5.2 Definition of Done

**Code Complete**:
- [ ] All composables implemented with SSR compatibility
- [ ] All components implemented with proper TypeScript types
- [ ] All middlewares implemented with workspace validation
- [ ] All server utilities implemented with error handling
- [ ] tRPC router implemented with all procedures

**Type Safety**:
- [ ] All TypeScript types exported from types/ directory
- [ ] No `any` types in public API
- [ ] Type-safe workspace and member models
- [ ] Auto-imported composables and utilities

**Testing**:
- [ ] Unit tests for workspace limits and token validation
- [ ] E2E tests for all user flows (create, switch, invite, manage)
- [ ] E2E tests for middleware protection
- [ ] E2E tests for data isolation

**Documentation**:
- [ ] README with setup instructions and usage examples
- [ ] JSDoc comments for all exported functions and types
- [ ] Examples for common use cases

**Integration**:
- [ ] Auth Layer integration via useUser()
- [ ] Billing Layer integration for workspace limits
- [ ] Entitlements Layer integration for role-based permissions
- [ ] tRPC router registered in main tRPC router
- [ ] GraphQL schema deployed to Amplify backend

**Quality**:
- [ ] ESLint passing with no errors
- [ ] TypeScript compilation with no errors
- [ ] All tests passing
- [ ] No console errors in browser

### 5.3 Plan

See [Workspaces Implementation Plan](../plan/workspaces.md).

**Deliverables**:
- Complete layer integration
- Comprehensive documentation
- All tests passing
- Production-ready code


## 6. Non-Functional Requirements

### 6.1 Security

**Data Isolation**:
- All workspace queries filtered by workspace membership
- Server-side validation of workspace access for all operations
- Invitation tokens signed with secure secret (JWT)
- No client-side workspace data mixing

**Access Control**:
- Role-based permissions enforced server-side
- Workspace ownership validated before destructive operations
- Team member validation before data access
- Invitation tokens expire after 7 days

**Token Security**:
- Invitation tokens use HS256 signing
- Tokens include workspace ID, email, and role
- Token validation before invitation acceptance
- One-time use tokens (deleted after acceptance)

### 6.2 Performance

**Workspace Switching**:
- Workspace switch: < 200ms (cookie update + navigation)
- Context load: < 300ms (GraphQL query with caching)
- Workspace list load: < 500ms

**Caching Strategy**:
- Workspace list cached for session
- Current workspace cached with cookie (1 year TTL)
- Member list cached with TTL (5 minutes)
- GraphQL query caching via Amplify

**Lazy Loading**:
- Workspace members loaded on-demand
- Pending invitations loaded when settings opened
- Workspace details fetched lazily

### 6.3 Scalability

**Database Design**:
- Indexed queries on workspace ID, user ID, email
- Efficient membership lookups via composite keys
- Pagination support for large member lists
- Invitation cleanup via TTL or scheduled job

**Plan Limits**:
- Free: 1 workspace, 1 member (personal only)
- Pro: 5 workspaces, 10 members per workspace
- Enterprise: Unlimited workspaces and members

**Growth Considerations**:
- Support for 100+ workspaces per user (enterprise)
- Support for 1000+ members per workspace (enterprise)
- Efficient workspace switching with large workspace lists
- Pagination for member lists in large workspaces
