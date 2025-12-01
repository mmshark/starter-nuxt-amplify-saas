# Implementation Plan: Notifications Layer

## Phases

### Phase 1: Core & Data Model (Week 1)
**Goal**: Backend infrastructure

**Tasks**:
1. Define Notification GraphQL model
2. Define UserPreferences type
3. Create server/utils/notify.ts
4. Implement useNotifications() composable

**Deliverables**:
- Data model deployed
- Basic API

### Phase 2: In-App Channel (Week 1)
**Goal**: Bell notifications

**Tasks**:
1. Create <NotificationBell> component
2. Create <NotificationList> component
3. Implement mark-as-read logic
4. Add real-time updates (optional)

**Deliverables**:
- Working in-app notifications

### Phase 3: Email Channel (Week 2)
**Goal**: Email delivery

**Tasks**:
1. Configure AWS SES / Pinpoint
2. Create email templates
3. Implement email dispatch logic
4. Add preference check

**Deliverables**:
- Email sending capability
- Preference respect

### Phase 4: Integration (Week 2)
**Goal**: System-wide events

**Tasks**:
1. Add notification triggers to other layers (Invite, Invoice)
2. Create preference settings UI

**Deliverables**:
- Integrated system
