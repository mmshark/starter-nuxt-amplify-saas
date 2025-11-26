# PRD: Billing Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
  - [2.1 Subscribe to Plan Flow](#21-subscribe-to-plan-flow)
  - [2.2 Access Customer Portal Flow](#22-access-customer-portal-flow)
  - [2.3 Upgrade/Downgrade Flow](#23-upgradedowngrade-flow)
  - [2.4 Cancel Subscription Flow](#24-cancel-subscription-flow)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Data Model](#31-data-model)
  - [3.2 Composables](#32-composables)
  - [3.3 Components](#33-components)
  - [3.4 Server API Endpoints](#34-server-api-endpoints)
  - [3.5 Webhook Endpoint](#35-webhook-endpoint)
  - [3.6 Data Access](#36-data-access)
  - [3.7 Server Utilities](#37-server-utilities)
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
  - [6.3 Reliability](#63-reliability)
  - [6.4 Integration](#64-integration)

## 1. Overview

### 1.1 Purpose

The Billing Layer provides **workspace-level** subscription management.

**Key Architectural Decision:**
- ✅ Subscriptions belong to **Workspaces**, not Users
- ✅ Stripe Customer ID stored on WorkspaceSubscription
- ✅ All workspace members share the same subscription plan
- ✅ Workspace owner manages billing
- ❌ UserProfile does NOT have subscription field

**Rationale:**
- Multi-tenant B2B SaaS model
- Teams collaborate under single subscription
- Simplifies billing (one subscription per workspace)
- Aligns with entitlements (workspace-scoped features)

**Excludes**:
- Payment method collection (handled by Stripe Customer Portal)
- Invoice generation (handled by Stripe)
- Tax calculation (handled by Stripe Tax)
- Authorization and feature entitlements (covered by Entitlements Layer)

### 1.3 Key Requirements

**Technical**:
- SSR-safe composables with universal API (client/server)
- Stripe API v2 integration with official SDK
- Secure webhook signature verification
- GraphQL integration for subscription state persistence
- Idempotent webhook processing with deduplication

**Functional**:
- User can view available subscription plans
- User can subscribe a **Workspace** to a plan
- User can upgrade/downgrade **Workspace** subscription
- User can access Stripe Customer Portal for payment management
- User can cancel subscription
- Subscription status syncs automatically from Stripe webhooks
- Server can validate subscription status for access control

### 1.4 Artifacts

**Data Models**:
- `SubscriptionPlan` - Subscription plan definitions (id, name, priceId, features, limits) stored in DynamoDB

**Types**:
- `SubscriptionState` - Reactive subscription state (non-persistent)
- `Plan` - Plan definition TypeScript type
- `BillingError` - Error handling model (non-persistent)

**Composables**:
- `useBilling()` - Universal subscription state and methods (client & server)

**Components**:
- `<PricingTable>` - Display subscription plans with selection
- `<PricingPlans>` - Pricing plans display with monthly/yearly toggle
- `<PricingPlan>` - Individual plan card component
- `<CurrentSubscription>` - Show current subscription details and status
- `<InvoicesList>` - Display billing history and invoices
- `<PaymentMethod>` - Show and manage payment method

**Server API Endpoints** (`layers/billing/server/api/billing/`):
- `POST /api/billing/checkout` - Create Stripe Checkout session with Amplify profile management
- `POST /api/billing/portal` - Create Customer Portal session with flow configuration
- `GET /api/billing/subscription` - Get current subscription status (Amplify + Stripe aggregation)
- `GET /api/billing/invoices` - Get user's billing invoices with pagination and filtering
- `POST /api/billing/webhook` - Handle Stripe webhook events (required by Stripe)

**Data Access**:
- Subscription plans accessed via **Amplify GraphQL** directly (`SubscriptionPlan` model)

**Server Utilities**:
- `requireSubscription(event, plans)` - Validate active subscription
- `withSubscription(handler, plans)` - HOF wrapper for subscription-gated endpoints


## 2. User Flows

### 2.1 Subscribe to Plan Flow
1. User views pricing table on `/pricing` or dashboard
2. User selects desired plan and clicks "Subscribe"
3. System creates Stripe Checkout session with plan details
4. User redirects to Stripe Checkout page
5. User enters payment information on Stripe
6. Stripe processes payment and creates subscription
7. Stripe redirects user to success URL (`/dashboard?success=true`)
8. Stripe webhook notifies app of new subscription
9. System updates user profile with subscription data via GraphQL
10. User sees active subscription in dashboard

### 2.2 Access Customer Portal Flow
1. User navigates to billing settings
2. User clicks "Manage Billing" button
3. System creates Stripe Customer Portal session
4. User redirects to Stripe Customer Portal
5. User can update payment method, view invoices, or cancel subscription
6. Changes in portal trigger Stripe webhooks
7. System receives webhooks and updates subscription state
8. User returns to app and sees updated subscription

### 2.3 Upgrade/Downgrade Flow
1. User accesses Stripe Customer Portal (via flow 2.2)
2. User selects different plan
3. Stripe processes plan change (immediate or at period end)
4. Stripe webhook notifies app of subscription update
5. System updates subscription data via GraphQL
6. User sees updated plan and features

### 2.4 Cancel Subscription Flow
1. User accesses Stripe Customer Portal
2. User clicks "Cancel Subscription"
3. Stripe schedules cancellation at period end
4. Stripe webhook notifies app of pending cancellation
5. System updates subscription status to `canceling`
6. User retains access until period end
7. At period end, Stripe webhook notifies cancellation
8. System updates subscription status to `canceled`
9. User loses access to premium features

## 3. Technical Specifications

### 3.1 Data Models

#### 3.1.1 SubscriptionPlan (GraphQL Schema)

GraphQL schema is defined in backend and auto-generated by AWS Amplify. The SubscriptionPlan model stores plan definitions with pricing and features in DynamoDB.

**GraphQL Schema** (`apps/backend/amplify/data/resource.ts`):
```typescript
const schema = a.schema({
  SubscriptionPlan: a.model({
    id: a.id().required(),             // Plan ID (e.g., 'free', 'pro', 'enterprise')
    name: a.string().required(),       // Display name
    priceId: a.string().required(),    // Stripe Price ID
    features: a.string().array(),      // Feature list
    limits: a.json(),                  // Usage limits (optional)
  })
    .authorization([a.allow.public().to(['read'])]),
});
```

#### 3.1.2 WorkspaceSubscription (GraphQL Schema)

GraphQL schema for workspace subscription data. This model stores the actual subscription state, linking workspaces to their subscription plans and Stripe subscriptions.

**GraphQL Schema** (`apps/backend/amplify/data/resource.ts`):
```typescript
const schema = a.schema({
  WorkspaceSubscription: a.model({
    workspaceId: a.id().required(),                   // FK to Workspace
    workspace: a.belongsTo('Workspace', 'workspaceId'), // Relationship to workspace
    planId: a.id().required(),                        // Current plan
    plan: a.belongsTo('SubscriptionPlan', 'planId'),  // Plan details
    stripeSubscriptionId: a.string(),                 // Stripe subscription ID
    stripeCustomerId: a.string(),                     // Stripe Customer ID (moved from UserProfile)
    status: a.enum([
      'active',
      'canceled',
      'past_due',
      'unpaid',
      'trialing',
      'incomplete',
      'incomplete_expired'
    ]).required(),
    currentPeriodStart: a.datetime(),
    currentPeriodEnd: a.datetime(),
    cancelAtPeriodEnd: a.boolean().default(false),
    canceledAt: a.datetime(),
    metadata: a.json(),                               // Additional Stripe metadata
  })
    .authorization([
      a.allow.custom(), // Authorized via Lambda/AppSync resolvers based on Workspace membership
    ]),
});
```

**Access Pattern**:
- Retrieved via `useBilling()` composable
- Updated via webhook events from Stripe
- Queried via tRPC procedures for subscription status

**Relationships**:
- Belongs to UserProfile (1:1 with user)
- Belongs to SubscriptionPlan (many users can have same plan)

### 3.2 Types

#### 3.2.1 Subscription State Schema

```typescript
interface SubscriptionData {
  subscription: any                    // Stripe subscription object
  plan: any                           // Current plan details
  paymentMethod: any                  // Payment method info
  usage: any[]                        // Usage data (if applicable)
}

interface InvoicesData {
  invoices: Invoice[]                 // Invoice list
  hasMore: boolean                    // Pagination indicator
  totalCount: number                  // Total count
}

interface Invoice {
  id: string                          // Stripe invoice ID
  number: string | null               // Invoice number
  date: string                        // Invoice date (ISO format)
  dueDate: string | null              // Due date (ISO format)
  amount: number                      // Amount paid (in dollars)
  currency: string                    // Currency code
  status: string                      // Invoice status
  description: string                 // Invoice description
  downloadUrl: string | null          // PDF download URL
  hostedUrl: string | null            // Hosted invoice URL
  lines: InvoiceLine[]                // Line items
  subtotal: number                    // Subtotal
  tax: number                         // Tax amount
  total: number                       // Total amount
  paymentMethod: PaymentMethodInfo | null  // Payment method used
}

interface InvoiceLine {
  description: string | null
  amount: number
  quantity: number | null
  period: {
    start: string                     // ISO date
    end: string                       // ISO date
  } | null
}

interface PaymentMethodInfo {
  type: string                        // 'card'
  brand: string                       // 'visa', 'mastercard', etc.
  last4: string                       // Last 4 digits
  expMonth: number                    // Expiration month
  expYear: number                     // Expiration year
}

interface StripePortalOptions {
  flow_type?: 'subscription_update' | 'subscription_cancel' | 'payment_method_update' | 'subscription_update_confirm'
  return_url?: string
  configuration_id?: string
  discount_id?: string
}
```

### 3.3 Composables

**`useBilling()`**

Universal composable that works seamlessly in client, SSR, and API routes contexts.

**Reactive State (Read-only)**
- `subscription: Ref<SubscriptionData | null>` - Current subscription, plan, payment method, and usage data
- `invoices: Ref<InvoicesData | null>` - Invoice history with pagination support
- `isLoading: ComputedRef<boolean>` - Combined loading state
- `subscriptionLoading: Ref<boolean>` - Subscription data loading state
- `invoicesLoading: Ref<boolean>` - Invoices loading state
- `isPortalLoading: Ref<boolean>` - Portal session creation loading state
- `initialized: Ref<boolean>` - Whether initial data load is complete
- `error: ComputedRef<string | null>` - Combined error state
- `subscriptionError: Ref<string | null>` - Subscription fetch error
- `invoicesError: Ref<string | null>` - Invoices fetch error

**Computed Helpers**
- `hasActivePaidSubscription: ComputedRef<boolean>` - User has active paid subscription
- `currentPlanId: ComputedRef<string>` - Current plan ID (defaults to 'free')
- `isFreePlan: ComputedRef<boolean>` - Whether user is on free plan

**Portal Methods**
- `createPortalUrl(options?): Promise<string>` - Create portal URL with flow options
- `createPortalSession(returnUrl?): Promise<Response>` - Create portal session (full response)
- `openPortal(options?): Promise<void>` - Open portal and auto-refresh on return
- `updateSubscription(returnUrl?): Promise<void>` - Portal flow for subscription updates
- `cancelSubscription(returnUrl?): Promise<void>` - Portal flow for cancellation
- `updatePaymentMethod(returnUrl?): Promise<void>` - Portal flow for payment method
- `confirmSubscriptionUpdate(discountId?, returnUrl?): Promise<void>` - Portal flow for confirming updates

**Checkout Methods**
- `createCheckoutSession(priceId, planId?, interval?): Promise<Response>` - Create Stripe Checkout session (supports two calling patterns)

**Data Methods**
- `fetchSubscription(): Promise<void>` - Load subscription data from API
- `fetchInvoices(options?): Promise<void>` - Load invoices with pagination support
- `refreshSubscription(): Promise<void>` - Refresh subscription data
- `refreshInvoices(): Promise<void>` - Clear and reload invoices
- `refreshAll(): Promise<void>` - Refresh all billing data
- `loadMoreInvoices(): Promise<void>` - Load next page of invoices
- `ensureInitialized(): Promise<void>` - One-time initialization (idempotent)
- `clearError(): void` - Clear all error states

**Usage Examples**

```vue
<!-- Components (client & server) -->
<script setup>
const { isActive, subscription, currentPlan, createPortal } = useBilling()

async function manageBilling() {
  const { url } = await createPortal()
  navigateTo(url, { external: true })
}
</script>

<!-- Server API Routes -->
<script>
export default defineEventHandler(async (event) => {
  const { subscription, fetchSubscription } = useBilling()
  await fetchSubscription()

  if (subscription.value?.plan !== 'enterprise') {
    throw createError({ statusCode: 403, message: 'Enterprise plan required' })
  }

  return { data: 'enterprise feature' }
})
</script>
```

### 3.4 Components

**`PricingTable`**

Wrapper component around Nuxt UI `<PricingTable>` with automatic data fetching.

**Behavior**
- Wraps Nuxt UI `<PricingTable>` component with identical API
- Accepts all Nuxt UI PricingTable props and events
- If no props provided, automatically fetches plans from `/api/billing/plans`
- Behaves exactly like Nuxt UI component when props are provided

**Features**
- Displays plan cards with features and pricing
- Highlights current plan and recommended plan
- Loading states during checkout creation
- Error handling and display
- Auto-fetches plans when used without props

**Usage Examples**
```vue
<!-- Automatic mode: fetches plans from API -->
<template>
  <PricingTable />
</template>

<!-- Manual mode: same as Nuxt UI component -->
<template>
  <PricingTable
    :plans="customPlans"
    highlight="pro"
    @plan-selected="handlePlanSelection"
  />
</template>
```

**`PricingPlans`**

Wrapper component around Nuxt UI `<PricingPlans>` with automatic data fetching.

**Behavior**
- Wraps Nuxt UI `<PricingPlans>` component with identical API
- Accepts all Nuxt UI PricingPlans props and events
- If no props provided, automatically fetches plans from `/api/billing/plans`
- Behaves exactly like Nuxt UI component when props are provided

**Features**
- Monthly/yearly billing interval toggle
- Plan comparison display
- Highlight recommended plans
- Show current plan
- Responsive layout
- Auto-fetches plans when used without props

**Usage Examples**
```vue
<!-- Automatic mode: fetches plans from API -->
<template>
  <PricingPlans />
</template>

<!-- Manual mode: same as Nuxt UI component -->
<template>
  <PricingPlans
    :plans="customPlans"
    :interval="billingInterval"
  />
</template>
```

**`PricingPlan`**

Wrapper component around Nuxt UI `<PricingPlan>` with automatic data fetching.

**Behavior**
- Wraps Nuxt UI `<PricingPlan>` component with identical API
- Accepts all Nuxt UI PricingPlan props and events
- If no props provided, automatically fetches plans from `/api/billing/plans`
- Behaves exactly like Nuxt UI component when props are provided

**Features**
- Plan name, description, and features
- Price display with billing interval
- CTA button for subscription
- Current plan indicator
- Customizable styling
- Auto-fetches plans when used without props

**Usage Examples**
```vue
<!-- Automatic mode: fetches plans from API -->
<template>
  <PricingPlan />
</template>

<!-- Manual mode: same as Nuxt UI component -->
<template>
  <PricingPlan
    :plan="planData"
    :interval="billingInterval"
  />
</template>
```

**`CurrentSubscription`**

Display current subscription details and status.

**Features**
- Shows current plan name and billing interval
- Displays next billing date
- Shows cancellation status if applicable
- Links to manage billing

**Usage Example**
```vue
<template>
  <CurrentSubscription />
</template>
```

**`PaymentMethod`**

Display and manage current payment method.

**Features**
- Shows current payment method (card brand, last 4 digits, expiration)
- Button to update payment method via Customer Portal
- Empty state for no payment method
- Loading skeleton states

**Usage Example**
```vue
<template>
  <PaymentMethod />
</template>
```

**`InvoicesList`**

Display billing history and invoices with download links.

**Features**
- Shows invoice history from Stripe
- Displays invoice details (date, amount, status)
- Download PDF and view hosted invoice
- Loading skeleton states
- Empty state for no invoices
- Responsive design

**Usage Example**
```vue
<template>
  <InvoicesList />
</template>
```

### 3.4 Server API Endpoints

**Location**: `layers/billing/server/api/billing/`

**Architecture**: Nuxt server/api endpoints with AWS Amplify Data (GraphQL/AppSync/DynamoDB) and Stripe API integration

**Endpoints**:
- `POST /api/billing/checkout` - Create Stripe Checkout session
- `POST /api/billing/portal` - Create Customer Portal session
- `GET /api/billing/subscription` - Get current subscription status
- `GET /api/billing/invoices` - List billing invoices
- `POST /api/billing/webhook` - Handle Stripe webhook events

**Implementation Pattern**:
```typescript
// All endpoints use withAmplifyPublic for Amplify Data context
import { getServerPublicDataClient, withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

export default defineEventHandler(async (event) => {
  return await withAmplifyPublic(async (contextSpec) => {
    const client = getServerPublicDataClient()
    // GraphQL operations via Amplify Data client
    await client.models.WorkspaceSubscription.get(contextSpec, { ... })
  })
})
```

**Authentication**: Handled by `server/middleware/auth.ts` for all `/api/billing` routes (except webhook)

**Validation**: Zod schemas for request body validation

---

#### `POST /api/billing/checkout`

Create Stripe Checkout session for subscription purchase with Amplify profile management.

**Request Body**:
```typescript
{
  workspaceId: string,      // Workspace ID (required)
  priceId: string,          // Stripe Price ID (required, format: price_*)
  planId: string,           // Plan ID (required)
  billingInterval: 'month' | 'year'  // Billing interval (required)
}
```

**Response**:
```typescript
{
  success: boolean,
  data: {
    url: string,            // Checkout session URL
    sessionId: string       // Stripe session ID
  }
}
```

**Behavior**:
- Requires authentication (via auth middleware)
- Validates user is Owner of the `workspaceId`
- Fetches or creates Stripe Customer ID in `WorkspaceSubscription` (Amplify GraphQL)
- Creates Stripe Checkout session with subscription mode
- Returns checkout URL for client redirect
- Validates input with Zod runtime validation

**Error Responses**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not workspace owner
- `400 Bad Request` - Invalid input data
- `500 Internal Server Error` - Stripe API error

---

#### `POST /api/billing/portal`

Create Stripe Customer Portal session with flow configuration.

**Request Body**:
```typescript
{
  workspaceId: string,                          // Workspace ID (required)
  flow_type?: 'subscription_update' |           // Portal flow type (optional)
              'subscription_cancel' |
              'payment_method_update' |
              'subscription_update_confirm',
  return_url?: string,                          // Return URL (optional)
  configuration_id?: string,                    // Portal configuration ID (optional)
  discount_id?: string                          // Discount ID (optional)
}
```

**Response**:
```typescript
{
  success: boolean,
  data: {
    url: string,            // Portal session URL
    created: number,        // Unix timestamp
    expires_at: number,     // Unix timestamp
    customer: string,       // Stripe customer ID
    flow_type: string,      // Flow type used
    return_url: string      // Return URL
  }
}
```

**Behavior**:
- Requires authentication
- Validates user is Owner of the `workspaceId`
- Fetches Stripe Customer ID from `WorkspaceSubscription` (Amplify GraphQL)
- Validates customer exists before creating portal session
- Configures portal session based on flow_type
- Returns portal URL and session metadata

**Error Responses**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not workspace owner
- `404 Not Found` - No Stripe customer found
- `500 Internal Server Error` - Stripe API error

---

#### `GET /api/billing/subscription`

Get current workspace subscription status with data aggregation from Amplify and Stripe.

**Query Parameters**:
```typescript
{
  workspaceId: string     // Workspace ID (required)
}
```

**Response**:
```typescript
{
  success: boolean,
  data: {
    subscription: {
      workspaceId: string,
      planId: string,
      stripeSubscriptionId: string | null,
      status: 'active' | 'past_due' | 'canceled' | 'trialing' | ...,
      currentPeriodStart: Date,
      currentPeriodEnd: Date | null,
      cancelAtPeriodEnd: boolean
    } | null,
    plan: {
      planId: string,
      name: string,
      monthlyPrice: number,
      yearlyPrice: number,
      currency: string
    } | null
  }
}
```

**Behavior**:
- Requires authentication
- Validates user is member of the workspace
- Fetches WorkspaceSubscription from Amplify GraphQL
- Enriches with SubscriptionPlan details
- Aggregates data from both Amplify and Stripe sources
- Returns null if no subscription exists

**Error Responses**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not workspace member
- `404 Not Found` - Workspace not found

---

#### `GET /api/billing/invoices`

Get workspace billing invoices with pagination and filtering.

**Query Parameters**:
```typescript
{
  workspaceId: string,           // Workspace ID (required)
  limit?: number,                // Items per page (1-100, default: 10)
  startingAfter?: string         // Cursor for pagination (optional)
}
```

**Response**:
```typescript
{
  success: boolean,
  data: {
    invoices: Array<{
      id: string,
      number: string | null,
      date: string,              // ISO date string
      amount: number,
      currency: string,
      status: string,
      downloadUrl: string | null
    }>,
    hasMore: boolean,
    totalCount: number
  }
}
```

**Behavior**:
- Requires authentication
- Validates user is member of the workspace
- Fetches Stripe Customer ID from Amplify GraphQL
- Retrieves paid invoices from Stripe API
- Transforms Stripe invoice data for frontend
- Supports cursor-based pagination
- Returns empty array if no customer or invoices

**Error Responses**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not workspace member
- `404 Not Found` - Workspace not found

---

### 3.5 Webhook Endpoint

**`POST /api/billing/webhook`**

Handle Stripe webhook events (required for Stripe integration).

**Headers**
- `stripe-signature` - Webhook signature for verification

**Request Body**
- Raw Stripe webhook event payload

**Response**
```typescript
{
  received: boolean
}
```

**Behavior**
- Public endpoint (no authentication - verified via Stripe signature)
- Verifies webhook signature using Stripe signing secret
- Processes subscription lifecycle events:
  - `checkout.session.completed` - New subscription created
  - `customer.subscription.updated` - Subscription modified
  - `customer.subscription.deleted` - Subscription canceled
  - `invoice.payment_succeeded` - Payment successful
  - `invoice.payment_failed` - Payment failed
- Updates UserSubscription in Amplify GraphQL/DynamoDB
- Returns `200 OK` for successful processing
- Idempotent processing (handles duplicate events via event ID tracking)

**Note**: This endpoint MUST remain REST as it's called by Stripe's external webhook system.

---

### 3.7 Data Access

**Subscription Plans** - Accessed via **Amplify GraphQL** directly:

```graphql
query ListPlans {
  listSubscriptionPlans(filter: { isActive: { eq: true } }) {
    items {
      planId
      name
      description
      monthlyPrice
      yearlyPrice
      priceCurrency
      stripeMonthlyPriceId
      stripeYearlyPriceId
      stripeProductId
      isActive
    }
  }
}
```

**Rationale**: Subscription plans are simple CRUD data from Amplify's SubscriptionPlan model, no custom business logic needed.

---

### 3.8 Server Utilities

**`requireSubscription(event, plans?)`** (server)

Validate user has active subscription for API route access.

**Signature**
```typescript
requireSubscription(event: H3Event, plans?: string[]): Promise<void>
```

**Parameters**
- `event` - H3 event object
- `plans` - Optional array of allowed plan IDs (e.g., `['pro', 'enterprise']`)

**Behavior**
- Validates authentication first
- Fetches subscription from GraphQL
- Checks subscription is active
- If `plans` specified, validates user is on one of those plans
- Throws error if validation fails:
  - `401 Unauthorized`: Not authenticated
  - `402 Payment Required`: No active subscription
  - `403 Forbidden`: Wrong plan level

**Usage Example**
```typescript
export default defineEventHandler(async (event) => {
  await requireSubscription(event, ['enterprise'])

  // Handler only runs for authenticated enterprise users
  return { data: 'enterprise-only feature' }
})
```

**`withSubscription(handler, plans?)`** (server)

Higher-order function that wraps handlers with subscription validation.

**Signature**
```typescript
withSubscription<T>(
  handler: (event: H3Event) => Promise<T> | T,
  plans?: string[]
): EventHandler<T>
```

**Behavior**
- Automatically validates subscription before executing handler
- Cleaner syntax for subscription-gated endpoints

**Usage Example**
```typescript
export default withSubscription(async (event) => {
  const { subscription } = useBilling()

  return {
    feature: 'pro-only-feature',
    plan: subscription.value?.plan
  }
}, ['pro', 'enterprise'])
```

---

## 4. Testing

### 4.1 Unit Tests (Minimal)

**Scope**: Pure utility functions without Stripe dependencies

**Examples**:
- Plan filtering and sorting logic
- Date formatting for billing periods
- Price display formatting
- Subscription status helpers

**Tools**: Vitest

### 4.2 E2E Tests (Primary)

**Scope**: Complete subscription flows with real Stripe integration

**Test Cases**:

**Subscription Creation Flow**:
- User can view pricing table
- User can click subscribe and redirect to Stripe Checkout
- User can complete checkout with test card
- Webhook processes subscription creation
- User sees active subscription in dashboard

**Customer Portal Flow**:
- User can access Customer Portal
- User can update payment method
- User can view invoices
- Changes sync back to app via webhooks

**Plan Change Flow**:
- User can upgrade plan
- User can downgrade plan
- Prorated charges calculated correctly
- Plan change reflects in app

**Cancellation Flow**:
- User can cancel subscription
- Subscription remains active until period end
- Access revoked after period end
- User can resubscribe after cancellation

**Webhook Processing**:
- Webhook signature verification works
- Duplicate webhooks are idempotent
- All subscription events update database correctly
- Failed webhooks are retried appropriately

**Tools**: Playwright (real browser testing) + Stripe Test Mode


## 5. Implementation

### 5.1 Layer Structure

```
layers/billing/
├── components/
│   ├── PricingTable.vue              # Subscription plan selection
│   ├── PricingPlans.vue              # Pricing plans with monthly/yearly toggle
│   ├── PricingPlan.vue               # Individual plan card component
│   ├── CurrentSubscription.vue       # Current subscription display
│   ├── InvoicesList.vue              # Billing history and invoices
│   └── PaymentMethod.vue             # Payment method display and management
├── composables/
│   └── useBilling.ts                 # Universal composable (client/SSR/API)
├── server/
│   ├── api/
│   │   └── billing/
│   │       ├── checkout.post.ts          # Create Stripe Checkout session
│   │       ├── portal.post.ts            # Create Customer Portal session
│   │       ├── subscription.get.ts       # Get subscription status
│   │       ├── invoices.get.ts           # List invoices
│   │       └── webhook.post.ts           # Handle Stripe webhooks
│   └── utils/
│       ├── stripe.ts                 # Stripe client initialization
│       ├── requireSubscription.ts    # Direct subscription validation
│       └── withSubscription.ts       # HOF wrapper for protected endpoints
├── utils/
│   ├── plans.ts                      # Plan definitions and helpers
│   └── errors.ts                     # Billing error types and formatting
├── types/
│   └── billing.d.ts                  # TypeScript definitions
├── nuxt.config.ts                    # Layer configuration
├── package.json                      # Package metadata
└── README.md                         # Public API documentation
```

### 5.2 Definition of Done

**Acceptance Criteria**

- [ ] User can view available subscription plans with monthly/yearly toggle
- [ ] User can subscribe to a plan via Stripe Checkout
- [ ] User is redirected to dashboard after successful payment
- [ ] User can access Stripe Customer Portal
- [ ] User can update payment method in Customer Portal
- [ ] User can view current payment method details
- [ ] User can view billing history and invoices
- [ ] User can download invoice PDFs
- [ ] Invoice pagination works correctly
- [ ] User can cancel subscription
- [ ] Subscription remains active until period end after cancellation
- [ ] Webhook endpoint processes Stripe events securely
- [ ] Subscription status syncs from Stripe to database
- [ ] Server utilities validate subscription status correctly
- [ ] Error messages are user-friendly
- [ ] Webhook processing is idempotent
- [ ] Loading states work correctly for all async operations

**Interfaces**

- [ ] `useBilling()` composable is implemented
- [ ] `PricingTable` component is implemented
- [ ] `PricingPlans` component is implemented
- [ ] `PricingPlan` component is implemented
- [ ] `CurrentSubscription` component is implemented
- [ ] `InvoicesList` component is implemented
- [ ] `PaymentMethod` component is implemented
- [ ] `POST /api/billing/checkout` endpoint is implemented
- [ ] `POST /api/billing/portal` endpoint is implemented
- [ ] `GET /api/billing/subscription` endpoint is implemented
- [ ] `GET /api/billing/invoices` endpoint is implemented
- [ ] `POST /api/billing/webhook` endpoint is implemented
- [ ] `requireSubscription()` utility is implemented
- [ ] `withSubscription()` utility is implemented
- [ ] Webhook signature verification is implemented
- [ ] Stripe API integration is implemented
- [ ] Zod schemas for all API endpoints are implemented

### 5.3 Plan

See [Billing Implementation Plan](../plan/billing.md).

## 6. Non-Functional Requirements

### 6.1 Security

**Stripe Integration Security**:
- Webhook signature verification (required)
- Stripe API keys stored as server-only secrets
- No sensitive data exposed to client
- HTTPS enforcement for all webhook endpoints
- Idempotent event processing to prevent duplicate charges

**Data Protection**:
- Payment data never stored in app (handled by Stripe)
- Customer IDs stored securely in DynamoDB
- Subscription status validated server-side for access control

### 6.2 Performance

**Response Time Targets**:
- Checkout session creation: < 2 seconds
- Portal session creation: < 2 seconds
- Webhook processing: < 5 seconds
- Subscription status check: < 500ms

**Optimization**:
- Subscription data cached in GraphQL/DynamoDB
- Minimal Stripe API calls (use webhooks for updates)
- Async webhook processing for non-critical events

### 6.3 Reliability

**Webhook Reliability**:
- Idempotent event processing (same event processed multiple times is safe)
- Stripe automatic webhook retry on failure (3 days)
- Event logging for debugging and auditing
- Graceful degradation if webhook processing fails

**Error Recovery**:
- Failed webhook processing logged and alerted
- Manual webhook replay capability
- Subscription status sync endpoint for recovery

### 6.4 Integration

**Dependencies**:
- Auth Layer: `useUser()` for authentication
- Amplify Layer: GraphQL client for data persistence
- Stripe: Official `stripe` npm package

**Configuration Requirements**:
- `STRIPE_SECRET_KEY` - Stripe secret API key (server-only)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (server-only)
- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (client-safe)
