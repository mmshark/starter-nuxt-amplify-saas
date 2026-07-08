# PRD: Notifications

> **Status**: Future · **Created**: 2026-07-08 · **Source**: doc/archive/prd/notifications.md

## Purpose & scope

A unified system for system-to-user communication across two channels — in-app notifications and transactional email — with centralized templates and a user preference center (opt-in/out). This PRD specifies the **target** design; almost none of it is built today (see [Current status](#current-status)). Delivery is planned as roadmap epic **E14** (see [Related](#related)).

**In scope**: bell/badge in-app notifications (polling; realtime is epic E23), transactional email triggers (welcome, invoice paid, workspace invite), a preference center, a template registry.

**Out of scope**: marketing campaigns (external tools; audience sync is epic E21) and user-to-user messaging.

## Requirements

### Functional

| # | Requirement |
|---|---|
| F1 | System events create in-app notifications; the bell icon shows a real unread-count badge. |
| F2 | Users can mark a single notification or all notifications as read. |
| F3 | Email channel respects per-category preferences before sending (e.g. skip if `email.billing === false`); security notifications cannot be disabled. |
| F4 | Preference center under user settings persists channel/category toggles to the user profile. |
| F5 | A notification router maps event type → channels (e.g. `WORKSPACE_INVITE` → in-app + email; `PASSWORD_RESET` → email only). |

### Data model

`Notification` model in `apps/backend/amplify/data/resource.ts`, owner-based auth, backed by DynamoDB:

```typescript
Notification: {
  id: ID
  userId: String (indexed, owner)
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  title: String
  message?: String
  actionUrl?: String
  isRead: Boolean (default false)
  createdAt: AWSDateTime
}
```

Preferences stored on the user profile:

```typescript
interface NotificationPreferences {
  email: { marketing: boolean; billing: boolean; security: true }
  inApp: { updates: boolean }
}
```

### API surface

- **Server utility** `notify.send({ userId, type, payload })` — validates payload against the event's template, checks preferences, dispatches to email provider (email) and DynamoDB (in-app). Event types come from a type-safe registry; email sending must not block the request (async/queued).
- **Authenticated Nitro endpoints** replacing the current mock: list notifications, mark-as-read, mark-all-as-read — following [../patterns/api-server.md](../patterns/api-server.md) and [../patterns/error-handling.md](../patterns/error-handling.md).
- **Composable** `useNotifications()` — `notifications`, `unreadCount` (computed), `markAsRead(id)`, `markAllAsRead()` — following [../patterns/composables.md](../patterns/composables.md).

### Layer structure (target)

```
layers/notifications/
├── components/        # NotificationBell, NotificationList, NotificationToast
├── composables/       # useNotifications.ts
├── server/
│   ├── templates/     # email/ + in-app/
│   └── utils/notify.ts
└── types/notifications.ts
```

Delivery is polling-based initially; live push via AppSync `observeQuery` is deferred to epic E23.

## Current status

**None of the above is implemented.** There is no `layers/notifications/`, no `Notification` model, no `notify.send`, no `useNotifications()`. Audit score: 2/5 implementation, 2/5 quality. What exists today:

| Area | Status | Evidence |
|---|---|---|
| Feedback toasts | **Working** — `useToast()` from @nuxt/ui, used consistently across auth, workspaces and billing layers | e.g. `layers/auth/components/Authenticator.vue`, `layers/workspaces/components/CreateWorkspaceModal.vue`, `layers/billing/composables/useBilling.ts` |
| Notification center UI | **Mock only** — Nuxt UI Dashboard template leftover; slideover opened from the bell icon and the `n` shortcut, rendering fake data | `apps/saas/app/components/NotificationsSlideover.vue`, `apps/saas/app/pages/index.vue`, `apps/saas/app/composables/useDashboard.ts` |
| Notifications API | **Mock, unauthenticated** — returns 27 hardcoded entries with external `i.pravatar.cc` avatars; no session check | `apps/saas/server/api/notifications.ts` |
| Unread badge | **Fake** — the bell's `UChip` is rendered unconditionally, never tied to unread state | `apps/saas/app/pages/index.vue` (line 45) |
| Mark as read | **Missing** — no endpoint, no UI action | — |
| Preferences page | **Dead stub** — hardcoded local reactive state; `onChange()` is an empty `// TODO`, changes are silently discarded | `layers/saas/pages/profile/notifications.vue` |
| Preference persistence | **Missing** — no write path; `UserProfile` grants owner only `read` (see risks) | `apps/backend/amplify/data/resource.ts` |
| `Notification` data model | **Missing** | `apps/backend/amplify/data/resource.ts` |
| Email channel | **Missing** — no email provider SDK anywhere in the repo; only Cognito's default verification/reset emails exist | `apps/backend/amplify/auth/resource.ts` |

## Open issues & risks

- **Unauthenticated mock endpoint**: `/api/notifications` validates no session. The only server auth middleware (`layers/workspaces/server/middleware/auth.ts`) returns early for any route not under `/api/workspaces`, so this endpoint is fully open. Its `i.pravatar.cc` avatar URLs add an external image dependency (privacy/CSP concern) if it ever ships.
- **Silent data loss in preferences**: users toggling e.g. "marketing" off in `layers/saas/pages/profile/notifications.vue` believe they opted out; nothing is saved. A compliance risk once real marketing email exists (epic E21 depends on E14 for honoring consent).
- **Misleading "sent" messaging**: workspace invitations report "Invitation sent successfully" — hardcoded in both the Lambda (`apps/backend/amplify/functions/workspace-membership/handler.ts`) and the toast in `layers/workspaces/components/InviteWorkspaceMemberModal.vue` — but no email is ever sent.
- **Preference persistence needs an auth-model change**: in `apps/backend/amplify/data/resource.ts`, `UserProfile` gives the owner only `read` (`allow.ownerDefinedIn('userId').to(['read'])`); the only writer is the post-confirmation trigger. Persisting preferences requires widening this auth rule or adding a dedicated write path.
- **Always-on badge**: the unconditional red chip trains users to ignore the bell, undermining the feature before it exists.

## Related

- [../prd/roadmap.md](../prd/roadmap.md) — **E14 notifications** (this PRD, Phase 2); **E23 realtime** (live delivery over AppSync `observeQuery`); **E21 email-marketing** (consent/unsubscribe honoring these preferences); **E10 observability** and **E12 security-hardening** (endpoint auth posture).
- [../patterns/api-server.md](../patterns/api-server.md) — pattern the authenticated notification endpoints must follow.
- [../patterns/error-handling.md](../patterns/error-handling.md) — the toast feedback pattern that is the only working notification mechanism today.
- [../patterns/composables.md](../patterns/composables.md) — conventions for the future `useNotifications()`.
