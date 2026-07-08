# Auth Layer

A comprehensive authentication layer for Nuxt 4 applications using AWS Amplify and Cognito. This layer provides complete user authentication functionality including sign-in, sign-up, email verification, session management, route protection, and user profile management with GraphQL integration.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Composables](#composables)
- [Server Middleware](#server-middleware)
- [Route Middleware](#route-middleware)
- [Components](#components)
- [Utils](#utils)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Overview

The Auth layer integrates AWS Amplify Auth with Nuxt 4, providing:

- 🔐 Complete authentication flow (sign-in, sign-up, verification, password reset)
- 🛡️ Route protection via middleware
- 🎨 Pre-built UI components
- 📱 SSR-compatible session management
- 🔄 Reactive user state management with GraphQL profile data
- 📧 Email verification and password reset flows
- 🚀 Server-side API authentication utilities
- 🎯 TypeScript support throughout

## Architecture

```
layers/auth/
├── components/           # Pre-built auth UI components
│   └── Authenticator.vue # Multi-step auth form component
├── composables/          # Reactive auth state management
│   └── useUser.ts       # Main auth composable with GraphQL integration
├── server/              # Server-side authentication utilities
│   └── utils/
│       └── middleware.ts # Server API authentication helpers
├── middleware/          # Route protection middleware
│   ├── auth.ts         # Protect authenticated routes
│   └── guest.ts        # Redirect authenticated users
├── utils/              # Helper functions
│   └── index.ts        # Auth utilities and error handling
└── nuxt.config.ts      # Layer configuration
```

## Composables

### `useUser()` / `useUserServer()`

The main authentication composable providing reactive user state and auth methods. Use `useUser()` for client-side and SSR contexts, and `useUserServer()` specifically for server-side API routes.

#### Reactive State

```typescript
interface UserState {
  isAuthenticated: boolean           // Authentication status
  authStep: string                  // Current auth step ('initial', 'challengeOTP', 'challengeTOTPSetup', 'authenticated')
  authSession: object | null        // Current authentication session
  tokens: object | null             // JWT tokens (access, ID, refresh)
  currentUser: AuthUser | null      // Current user object from AWS Amplify
  userAttributes: object | null     // Cognito user attributes (email, name, etc)
  userProfile: object | null        // User profile data from GraphQL (includes Stripe data)
  loading: boolean                  // Loading state for async operations
  error: string | null              // Error message if operation fails
}
```

#### Auth Methods

**Client-side only methods:**
- `signUp(data)` - Register new user with multi-step flow handling
- `signIn(credentials)` - Sign in user with MFA challenge support
- `confirmOTP(code)` - Complete OTP/TOTP challenge during sign in
- `signOut()` - Sign out the current user
- `resetPassword(username)` - Send password reset code to email
- `confirmResetPassword(username, code, newPassword)` - Complete password reset

**Universal methods (client & server):**
- `fetchUser(event?)` - Fetch complete user data (auth + profile from GraphQL)
- `updateAttributes(attributes)` - Update Cognito user attributes
- `updateUserProfile(profileData)` - Update user profile data via GraphQL
- `fetchUserProfile(event?)` - Fetch only user profile data from GraphQL

#### Basic Usage

```vue
<script setup>
const {
  isAuthenticated,
  userAttributes,
  userProfile,
  loading,
  error,
  signIn,
  signOut,
  fetchUser
} = useUser()

// Initialize user session
onMounted(async () => {
  await fetchUser()
})

// Sign in user
const handleSignIn = async () => {
  try {
    await signIn({
      username: 'user@example.com',
      password: 'password123'
    })

    if (isAuthenticated.value) {
      console.log('User signed in:', userAttributes.value?.email)
      console.log('Stripe Customer:', userProfile.value?.stripeCustomerId)
    }
  } catch (err) {
    console.error('Sign in failed:', error.value)
  }
}
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="isAuthenticated">
    <p>Welcome {{ userAttributes?.email }}!</p>
    <p>Stripe Customer ID: {{ userProfile?.stripeCustomerId }}</p>
    <button @click="signOut">Sign Out</button>
  </div>
  <div v-else>
    <button @click="handleSignIn">Sign In</button>
  </div>
</template>
```

#### Server-side Usage

```typescript
// For server-side API routes, pages, or middleware
const {
  isAuthenticated,
  userAttributes,
  userProfile,
  fetchUser
} = useUserServer()

// Fetch user data with server context
await fetchUser(event)

if (isAuthenticated.value) {
  const userId = userAttributes.value?.sub
  const email = userAttributes.value?.email
  const stripeCustomerId = userProfile.value?.stripeCustomerId
  // Use authenticated user data...
}
```

#### Multi-Step Authentication

```typescript
const handleAdvancedSignIn = async (email: string, password: string) => {
  await signIn({ username: email, password })

  // Handle different auth challenges
  switch (authStep.value) {
    case 'challengeOTP':
      // Show SMS/TOTP code input
      showOTPInput()
      break
    case 'challengeTOTPSetup':
      // Show TOTP setup (first-time MFA)
      showTOTPSetup()
      break
    case 'authenticated':
      // Success - user is fully authenticated
      navigateTo('/dashboard')
      break
  }
}

// Complete OTP challenge
const handleOTPConfirm = async (code: string) => {
  await confirmOTP(code)
  if (authStep.value === 'authenticated') {
    navigateTo('/dashboard')
  }
}
```

#### Password Reset Flow

```typescript
// Send reset code
const handlePasswordReset = async (email: string) => {
  const result = await resetPassword(email)
  if (result.success) {
    // Show code input form
    showResetCodeForm()
  }
}

// Complete reset with new password
const handleResetConfirm = async (email: string, code: string, newPassword: string) => {
  const result = await confirmResetPassword(email, code, newPassword)
  if (result.success) {
    navigateTo('/auth/login')
  }
}
```

## Server Middleware

### `requireAuth(event)` and `withAuth(handler)`

Server-side authentication utilities for protecting API routes.

#### `requireAuth(event)`

Direct authentication validation for server API routes. Only validates authentication and throws 401 error if not authenticated.

```typescript
import { requireAuth } from '@mmshark/auth-layer/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Validate authentication - throws 401 if not authenticated
  await requireAuth(event)

  // Get user data after authentication
  const { userAttributes, userProfile } = useUserServer()

  // Use authenticated user data
  const userId = userAttributes.value?.sub
  const stripeCustomerId = userProfile.value?.stripeCustomerId

  // Your protected API logic here...
  return { data: 'protected data' }
})
```

#### `withAuth(handler)`

Higher-order function that wraps an event handler with authentication.

```typescript
import { withAuth } from '@mmshark/auth-layer/server/utils/auth'

export default withAuth(async (event) => {
  // Authentication already validated
  const { userAttributes, userProfile } = useUserServer()

  // Your protected API logic here...
  return {
    user: userAttributes.value,
    profile: userProfile.value
  }
})
```

#### When to use which approach:

- **Use `requireAuth()`** when you need granular control or conditional authentication
- **Use `withAuth()`** when you always need authentication at the start of the handler
- **Use `useUserServer()` directly** when you handle authentication yourself

## Route Middleware

### `auth` Middleware

Protects routes by requiring authentication. Redirects unauthenticated users to login.

```vue
<script setup>
// Protect this page - requires authentication
definePageMeta({
  middleware: 'auth'
})
</script>
```

The middleware automatically:
- Calls `fetchUser(event)` to validate session and fetch user profile data
- Redirects to `/auth/login` if not authenticated
- Preserves intended destination in redirect query parameter
- Works with both client-side navigation and SSR

### `guest` Middleware

Redirects authenticated users away from auth pages (login, signup).

```vue
<script setup>
// Redirect authenticated users to dashboard
definePageMeta({
  middleware: 'guest'
})
</script>

<template>
  <!-- Login form - only shown to unauthenticated users -->
  <Authenticator />
</template>
```

## Components

### `<Authenticator>`

A complete authentication component that handles sign-in, sign-up, and email verification flows.

#### Props

- `providers` - External auth providers (optional)
- `signInFields` - Custom sign-in form fields
- `signUpFields` - Custom sign-up form fields
- `verifyFields` - Custom verification form fields
- `state` - Initial state: `'signin' | 'signup' | 'verify'`

#### Events

- `@signedIn` - Emitted when user successfully authenticates
- `@stateChange` - Emitted when auth flow state changes

#### Basic Usage

```vue
<template>
  <Authenticator
    @signed-in="handleSignIn"
    :state="'signin'"
  />
</template>

<script setup>
const handleSignIn = () => {
  navigateTo('/dashboard')
}
</script>
```

## Utils

### Authentication Utilities

When explicit typing is needed, import types directly from AWS Amplify:

```typescript
import type { AuthUser } from 'aws-amplify/auth'

// AuthUser is the standard AWS Amplify user object
const currentUser: AuthUser = // ... authenticated user
```

The composables use TypeScript inference for most state and parameters, providing type safety without explicit interfaces.

### Utility Functions

```typescript
// Route checking utilities
isProtectedRoute('/dashboard')    // true
isProtectedRoute('/auth/login')   // false
isAuthRoute('/auth/signup')       // true
isAuthRoute('/dashboard')         // false

// Safe redirect handling
getRedirectUrl({ redirect: '/dashboard' })  // '/dashboard'
getRedirectUrl({ redirect: 'https://evil.com' })  // '/' (safe)

// User data extraction
getUserDisplayName(userAttributes)  // 'John Smith' or fallback
getUserEmail(userAttributes)        // 'user@example.com'

// Error handling with friendly messages
handleAuthError(error)    // 'Invalid email or password'
```

## Usage Examples

### Complete Authentication Flow

```vue
<!-- pages/auth/login.vue -->
<script setup>
definePageMeta({
  middleware: 'guest',
  layout: 'auth'
})

const router = useRouter()

const handleSignedIn = () => {
  const redirect = router.currentRoute.value.query.redirect as string
  navigateTo(redirect || '/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full">
      <Authenticator
        @signed-in="handleSignedIn"
        :state="'signin'"
      />
    </div>
  </div>
</template>
```

### Protected Dashboard

```vue
<!-- pages/dashboard/index.vue -->
<script setup>
definePageMeta({
  middleware: 'auth'
})

const { userAttributes, userProfile, signOut, loading } = useUser()

const handleSignOut = async () => {
  await signOut()
  navigateTo('/auth/login')
}
</script>

<template>
  <div v-if="loading">Loading dashboard...</div>

  <div v-else class="dashboard">
    <header class="flex justify-between items-center p-6">
      <h1>Dashboard</h1>
      <div class="flex items-center gap-4">
        <span>{{ userAttributes?.email }}</span>
        <button @click="handleSignOut">Sign Out</button>
      </div>
    </header>

    <main class="p-6">
      <p>Welcome back!</p>
      <p>User ID: {{ userAttributes?.sub }}</p>
      <p>Stripe Customer: {{ userProfile?.stripeCustomerId }}</p>
    </main>
  </div>
</template>
```

### Protected API Route

```typescript
// server/api/billing/subscription.get.ts
export default defineEventHandler(async (event) => {
  // Authenticate and fetch user data
  const { userAttributes, userProfile, fetchUser } = useUserServer()
  await fetchUser(event)

  if (!userProfile.value?.stripeCustomerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No Stripe customer found'
    })
  }

  // Return protected data
  return {
    success: true,
    data: userProfile.value
  }
})
```

### User Profile Management

```vue
<!-- pages/profile.vue -->
<script setup>
definePageMeta({
  middleware: 'auth'
})

const { userAttributes, updateAttributes, loading } = useUser()

const profileForm = ref({
  firstName: '',
  lastName: '',
  phone: ''
})

// Load current profile data
watchEffect(() => {
  if (userAttributes.value) {
    profileForm.value = {
      firstName: userAttributes.value['given_name'] || '',
      lastName: userAttributes.value['family_name'] || '',
      phone: userAttributes.value['phone_number'] || ''
    }
  }
})

const updateProfile = async () => {
  try {
    await updateAttributes({
      'given_name': profileForm.value.firstName,
      'family_name': profileForm.value.lastName,
      'phone_number': profileForm.value.phone
    })

    console.log('Profile updated successfully!')
  } catch (err) {
    console.error('Update failed:', err)
  }
}
</script>

<template>
  <form @submit.prevent="updateProfile">
    <h2>Edit Profile</h2>

    <div>
      <label>First Name</label>
      <input v-model="profileForm.firstName" type="text" required>
    </div>

    <div>
      <label>Last Name</label>
      <input v-model="profileForm.lastName" type="text" required>
    </div>

    <div>
      <label>Phone Number</label>
      <input v-model="profileForm.phone" type="tel">
    </div>

    <button type="submit" :disabled="loading">
      {{ loading ? 'Updating...' : 'Update Profile' }}
    </button>
  </form>
</template>
```

## API Reference

### `useUser()` / `useUserServer()` Return Values

#### State Properties
- `isAuthenticated: ComputedRef<boolean>` - Authentication status
- `authStep: ComputedRef<string>` - Current authentication step
- `authSession: ComputedRef<object | null>` - Current authentication session
- `tokens: ComputedRef<object | null>` - JWT tokens (access, ID, refresh)
- `currentUser: ComputedRef<AuthUser | null>` - Current authenticated user object
- `userAttributes: ComputedRef<object | null>` - User attributes from Cognito
- `userProfile: ComputedRef<object | null>` - User profile data from GraphQL
- `loading: ComputedRef<boolean>` - Loading state for async operations
- `error: ComputedRef<string | null>` - Current error message

#### Auth Methods (Client-side only)
- `signUp(data): Promise<any>` - Register new user with multi-step flow
- `signIn(credentials): Promise<any>` - Authenticate user with MFA support
- `confirmOTP(code): Promise<any>` - Complete OTP/TOTP challenge
- `signOut(): Promise<void>` - Sign out current user
- `resetPassword(username): Promise<{ success: boolean, error?: string }>` - Send reset code
- `confirmResetPassword(username, code, newPassword): Promise<{ success: boolean, error?: string }>` - Complete password reset

#### Universal Methods (Client & Server)
- `fetchUser(event?): Promise<void>` - Fetch complete user data (auth + profile)
- `updateAttributes(attributes): Promise<void>` - Update Cognito user attributes
- `updateUserProfile(profileData): Promise<void>` - Update user profile via GraphQL
- `fetchUserProfile(event?): Promise<void>` - Fetch user profile data from GraphQL

### Error Handling

The layer includes comprehensive error handling with user-friendly messages:

```typescript
// Common errors are automatically mapped to friendly messages
'UserNotFoundException' → 'No account found with this email address'
'NotAuthorizedException' → 'Invalid email or password'
'UserNotConfirmedException' → 'Please verify your email address before signing in'
'InvalidPasswordException' → 'Password does not meet requirements'
'UsernameExistsException' → 'An account with this email already exists'
'CodeMismatchException' → 'Invalid verification code'
'ExpiredCodeException' → 'Verification code has expired'
'LimitExceededException' → 'Too many attempts. Please try again later'
'TooManyRequestsException' → 'Too many requests. Please try again later'
```

This comprehensive auth layer provides everything needed for secure user authentication in a Nuxt 4 application with AWS Amplify, including server-side API protection and GraphQL-based user profile management.