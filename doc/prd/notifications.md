# PRD: Notifications Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
- [2. User Flows](#2-user-flows)
  - [2.1 In-App Notification Flow](#21-in-app-notification-flow)
  - [2.2 Email Notification Flow](#22-email-notification-flow)
  - [2.3 Preference Management](#23-preference-management)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Architecture](#31-architecture)
  - [3.2 Data Model](#32-data-model)
  - [3.3 Composables](#33-composables)
  - [3.4 Server Utilities](#34-server-utilities)
- [4. Implementation](#4-implementation)

## 1. Overview

### 1.1 Purpose

The Notifications Layer provides a unified system for communicating with users through multiple channels (In-App and Email). It centralizes the logic for sending messages, managing templates, and handling user preferences (opt-in/out).

### 1.2 Scope

**Includes**:
- **In-App Notifications**: Real-time or polling-based "Bell" notifications.
- **Transactional Emails**: System-triggered emails (Welcome, Invoice Paid, Invite).
- **Preference Center**: UI for users to control what they receive and where.
- **Template Management**: Centralized registry of message templates.

**Excludes**:
- Marketing campaigns (handled by external tools like Mailchimp/Customer.io, though this layer could integrate with them).
- Chat/Messaging (this is for system-to-user, not user-to-user).

### 1.3 Key Requirements

**Technical**:
- **Unified API**: `notify(user, event)` handles channel selection automatically.
- **Async Processing**: Sending emails should not block the main request (use Queues/EventBridge).
- **Type-Safe Events**: Defined event registry to prevent typos.

**Functional**:
- Users can mark in-app notifications as read.
- Users can unsubscribe from specific email categories (Marketing vs. Transactional).
- System respects user preferences before sending.

## 2. User Flows

### 2.1 In-App Notification Flow

1. **Trigger**: System event occurs (e.g., "You were invited to Workspace X").
2. **Process**: System creates a `Notification` record in DynamoDB.
3. **Delivery**:
   - **Real-time**: AppSync Subscription pushes data to client (optional enhancement).
   - **Polling**: Client fetches unread count on page load.
4. **UI**: Red badge appears on Bell icon.
5. **Action**: User clicks Bell, sees list, clicks "Mark all as read".

### 2.2 Email Notification Flow

1. **Trigger**: System event occurs (e.g., "Invoice Paid").
2. **Check**: System checks `UserPreferences`.
   - If `email_notifications.billing === false`, abort.
3. **Render**: System loads "Invoice Paid" template, injects data.
4. **Send**: System calls AWS SES / Pinpoint.
5. **Receive**: User gets email.

### 2.3 Preference Management

1. User goes to User Settings -> Notifications.
2. User sees toggles:
   - [x] New Login Alerts (Security - Cannot disable)
   - [x] Billing & Invoices (Email)
   - [ ] Marketing Updates (Email)
   - [x] Team Invites (In-App)
3. User toggles "Marketing Updates" to OFF.
4. System updates `UserProfile`.

## 3. Technical Specifications

### 3.1 Architecture

**Event-Driven Approach**:
Instead of calling `sendEmail()` directly in business logic, we emit events.

```typescript
// Business Logic
await notify.send({
  userId: '123',
  type: 'WORKSPACE_INVITE',
  payload: { workspaceName: 'Acme' }
})
```

**Notification Router**:
Determines channels based on event type and user prefs.
- `WORKSPACE_INVITE` -> [In-App, Email]
- `PASSWORD_RESET` -> [Email]

### 3.2 Data Model

**Notification** (DynamoDB/GraphQL):
```typescript
type Notification @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  userId: String! @index
  type: String! # 'INFO', 'SUCCESS', 'WARNING', 'ERROR'
  title: String!
  message: String
  actionUrl: String
  isRead: Boolean! @default(value: "false")
  createdAt: AWSDateTime!
}
```

**UserPreferences** (in UserProfile):
```typescript
interface NotificationPreferences {
  email: {
    marketing: boolean;
    billing: boolean;
    security: boolean; // Always true
  };
  inApp: {
    updates: boolean;
  };
}
```

### 3.3 Composables

**`useNotifications()`**
- `notifications`: Ref<Notification[]>
- `unreadCount`: Computed<number>
- `markAsRead(id)`: Promise<void>
- `markAllAsRead()`: Promise<void>

### 3.4 Server Utilities

**`notify.send(options)`**
- Validates payload against template.
- Checks preferences.
- Dispatches to SES (Email) and DynamoDB (In-App).

## 4. Implementation

### 4.1 Layer Structure

```
layers/notifications/
├── components/
│   ├── NotificationBell.vue
│   ├── NotificationList.vue
│   └── NotificationToast.vue
├── composables/
│   └── useNotifications.ts
├── server/
│   ├── templates/
│   │   ├── email/
│   │   └── in-app/
│   └── utils/
│       └── notify.ts
└── types/
    └── notifications.ts
```

### 4.2 Plan
See [Notifications Implementation Plan](../plan/notifications.md).
