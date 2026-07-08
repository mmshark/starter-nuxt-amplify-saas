# Debug Layer

Development debugging tools and utilities for Nuxt 4 applications. This layer provides comprehensive debugging pages and tools for development and testing environments.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Debug Pages](#debug-pages)
- [Usage Examples](#usage-examples)
- [Development Guidelines](#development-guidelines)

## Overview

The Debug layer provides development tools for:

- 🔍 **Authentication Debugging** - Test auth flows and session management
- 💳 **Billing Testing** - Create test subscriptions and portal access
- 📊 **State Inspection** - View current application state
- 🛠️ **Development Utilities** - Tools for rapid development and testing
- 🚀 **Environment Info** - Runtime configuration and app config inspection
- 🧪 **API Testing** - Test billing endpoints and responses

## Architecture

```
layers/debug/
├── pages/debug/          # Debug pages (development only)
│   ├── index.vue         # Main debug dashboard
│   └── profile.vue       # User profile debugging
└── nuxt.config.ts        # Layer configuration
```

## Debug Pages

### Main Debug Dashboard (`/debug`)

The primary debugging interface providing comprehensive development tools.

**Features:**
- **Authentication State** - Current user, attributes, session info
- **Billing State** - Subscription status, plans, testing tools
- **Quick Actions** - Create test subscriptions, open customer portal
- **Environment Info** - Runtime config, app config inspection
- **Error Testing** - Error handling verification

**Sections:**

#### Authentication Debug
```typescript
// Available debugging info
{
  user: AuthUser | null,              // Current authenticated user
  userAttributes: Record<string, any>, // Cognito user attributes
  isAuthenticated: boolean,           // Authentication status
  authStep: string,                  // Current auth step
  displayName: string,               // Computed display name
  email: string,                     // User email
  sessionInfo: any                   // Raw session information
}
```

#### Billing Debug
```typescript
// Billing state inspection
{
  subscription: UserSubscription | null,  // Current subscription
  currentPlan: BillingPlan | null,        // Current plan details
  isActive: boolean,                      // Subscription status
  status: string,                         // Subscription status text
  availablePlans: BillingPlan[],          // All available plans
  error: string | null                    // Billing errors
}
```

#### Quick Test Actions
- **Create Test Subscription** - Generate test subscription data
- **Open Customer Portal** - Access Stripe customer portal
- **Test Checkout Flow** - Create and test checkout sessions
- **Cancel/Resume Subscription** - Test subscription management

### User Profile Debug (`/debug/profile`)

Dedicated page for user profile and attributes debugging.

**Features:**
- User attribute inspection
- Profile update testing
- Session management testing
- Auth flow verification

## Usage Examples

### Accessing Debug Tools

```vue
<!-- Available only in development -->
<template>
  <div>
    <NuxtLink to="/debug" class="debug-link">
      🔍 Debug Tools
    </NuxtLink>
  </div>
</template>
```

### Testing Authentication

```typescript
// In debug page - test auth flows
const testSignIn = async () => {
  const result = await signIn('test@example.com', 'password123')
  console.log('Sign in result:', result)
}

// Check session information
const checkSession = async () => {
  const info = await getSessionInfo()
  console.log('Session info:', info)
}
```

### Testing Billing Flows

```vue
<script setup>
const { createCheckoutSession, createPortalSession } = useBilling()

// Test checkout session creation
const testCheckout = async (planId: string) => {
  const result = await createCheckoutSession(planId)
  if (result.success) {
    console.log('Checkout URL:', result.data.url)
    // In debug mode, log instead of redirect
  }
}

// Test customer portal access
const testPortal = async () => {
  const result = await createPortalSession('/debug')
  if (result.success) {
    console.log('Portal URL:', result.data.url)
  }
}
</script>

<template>
  <div class="debug-billing">
    <h3>Billing Tests</h3>
    
    <div class="test-actions">
      <button @click="testCheckout('pro')">
        Test Pro Checkout
      </button>
      
      <button @click="testPortal">
        Test Customer Portal
      </button>
    </div>
  </div>
</template>
```

### Environment Inspection

```vue
<script setup>
const appConfig = useAppConfig()
const runtimeConfig = useRuntimeConfig()

const debugInfo = computed(() => ({
  environment: process.env.NODE_ENV,
  appConfig: appConfig,
  runtimeConfig: {
    public: runtimeConfig.public,
    // Server-side config is not exposed to client
  }
}))
</script>

<template>
  <div class="debug-environment">
    <h3>Environment Debug</h3>
    
    <pre>{{ JSON.stringify(debugInfo, null, 2) }}</pre>
  </div>
</template>
```

### Custom Debug Components

```vue
<!-- components/DebugPanel.vue -->
<template>
  <div v-if="isDev" class="debug-panel">
    <details>
      <summary>🔍 Debug Info</summary>
      <div class="debug-content">
        <slot :debug-data="debugData" />
      </div>
    </details>
  </div>
</template>

<script setup>
const isDev = process.dev

const debugData = {
  timestamp: new Date().toISOString(),
  route: useRoute().path,
  user: useUser().user.value,
  // Add more debug data as needed
}
</script>
```

### API Endpoint Testing

```typescript
// Test billing API endpoints directly
const testBillingAPI = async () => {
  try {
    // Test subscription fetch
    const response = await $fetch('/api/billing/subscription')
    console.log('Subscription data:', response)
    
    // Test checkout creation
    const checkout = await $fetch('/api/billing/checkout', {
      method: 'POST',
      body: { priceId: 'price_123' }
    })
    console.log('Checkout response:', checkout)
    
  } catch (error) {
    console.error('API test failed:', error)
  }
}
```

### State Watchers

```vue
<script setup>
const { user, isAuthenticated } = useUser()
const { subscription, isActive } = useBilling()

// Watch for auth changes
watch(isAuthenticated, (newVal, oldVal) => {
  console.log(`Auth changed: ${oldVal} -> ${newVal}`)
})

// Watch for subscription changes
watch(subscription, (newVal, oldVal) => {
  console.log('Subscription changed:', {
    old: oldVal?.status,
    new: newVal?.status
  })
})
</script>
```

## Development Guidelines

### When to Use Debug Tools

1. **Development Environment Only** - Debug tools should never appear in production
2. **Testing New Features** - Use for testing auth flows, billing integrations
3. **State Debugging** - When troubleshooting reactive state issues
4. **API Testing** - Verify API endpoints work correctly
5. **User Flow Testing** - Test complete user journeys

### Security Considerations

```typescript
// Always check environment before exposing debug info
const isDevelopment = process.dev

if (isDevelopment) {
  // Debug functionality here
  console.log('Debug info:', sensitiveData)
}
```

### Adding New Debug Tools

1. **Create in debug layer** - Keep all debug tools in this layer
2. **Environment guards** - Always check for development environment
3. **Clear documentation** - Document what each tool does
4. **Safe data exposure** - Don't expose sensitive production data

### Debug Page Structure

```vue
<template>
  <div class="debug-page">
    <header class="debug-header">
      <h1>🔍 Debug Tools</h1>
      <p class="env-badge">{{ environment }}</p>
    </header>
    
    <div class="debug-sections">
      <section class="debug-section">
        <h2>Section Title</h2>
        <div class="debug-content">
          <!-- Debug tools here -->
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
// Environment check
if (!process.dev) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

definePageMeta({
  layout: false, // Custom layout for debug pages
})
</script>
```

### Best Practices

1. **Environment Safety** - Never expose debug tools in production
2. **Responsive Design** - Ensure debug pages work on all screen sizes
3. **Clear Labeling** - Make it obvious what each debug tool does
4. **Error Handling** - Gracefully handle debug operation failures
5. **Performance** - Don't impact app performance with debug code
6. **Data Privacy** - Don't log sensitive user information

This debug layer provides comprehensive development tools while maintaining security and performance standards.