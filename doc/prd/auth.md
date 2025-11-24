# PRD: Auth Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
  - [2.1 Registration Flow](#21-registration-flow)
  - [2.2 Login Flow](#22-login-flow)
  - [2.3 Logout Flow](#23-logout-flow)
  - [2.4 Password Recovery Flow](#24-password-recovery-flow)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Data Model](#31-data-model)
  - [3.2 Composables](#32-composables)
  - [3.3 Components](#33-components)
  - [3.4 Middlewares](#34-middlewares)
  - [3.5 Utilities](#35-utilities)
  - [3.6 Server Endpoints](#36-server-endpoints)
- [4. Testing](#4-testing)
  - [4.1 Unit Tests (Minimal)](#41-unit-tests-minimal)
  - [4.2 E2E Tests (Primary)](#42-e2e-tests-primary)
- [5. Implementation](#5-implementation)
  - [5.1 Layer Structure](#51-layer-structure)
  - [5.2 Definition of Done](#52-definition-of-done)
  - [5.3 Plan](#53-plan)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1 Security](#61-security)

## 1. Overview

### 1.1 Purpose

The Auth Layer provides complete authentication functionality for a Nuxt 4-based SaaS application with AWS Amplify backend. It handles user identity management, session lifecycle, route protection, and integrates with AWS Cognito for authentication services.

### 1.2 Scope

**Includes**:
- Full authentication lifecycle: registration, login, logout, password recovery
- AWS Cognito integration via Amplify SDK
- Stateless JWT token authentication with server-side validation
- SSR-compatible implementation for Nuxt 4
- Route protection with middleware
- GraphQL integration for user profile data
- User profile components (UserProfileSettings for editing profile data)
- MFA support (TOTP/SMS)

**Excludes**:
- Authorization and permissions (covered by Entitlements Layer)
- Social login configuration (handled in backend)
- Billing and subscription management

### 1.3 Key Requirements

**Technical**:
- SSR-safe composables with universal API (client/server)
- JWT validation with `jose` library on server
- Dual token storage (localStorage + HTTP-only cookies)
- Token lifecycle management (refresh, expiration)
- GraphQL profile synchronization via Lambda triggers

**Functional**:
- User registration with email verification
- Login/logout flows with MFA support
- Password reset functionality
- Session persistence across reloads
- Protected route middleware


### 1.4 Artifacts

**Data Models**:
- `UserProfile` - Application-specific user profile data stored in DynamoDB (subscription, preferences, metadata)

**Types**:
- `UserState` - Reactive authentication state (non-persistent)
- `User` - Cognito user attributes abstraction (email, name, phone from AWS Cognito User Pool)
- `AuthError` - Error handling model (non-persistent)

**Composables**:
- `useUser()` - Universal authentication state and methods (client & server)

**Components**:
- `<Authenticator>` - Multi-step authentication form (signin/signup/verify)
- `<UserProfileSettings>` - User profile editing component

**Middlewares**:
- `auth` (client & server) - Protect authenticated routes
- `guest` (client & server) - Redirect authenticated users from auth pages

**Server Utilities**:
- `requireAuth(event)` - Direct authentication validation for API routes
- `withAuth(handler)` - HOF wrapper for protected endpoints

**Server Endpoints**:
- No custom endpoints - Authentication handled client-side via AWS Amplify SDK


## 2. User Flows

### 2.1 Registration Flow
1. User navigates to `/auth/signup`
2. User enters email, password, and optional profile data
3. System validates input and creates Cognito user
4. System sends email verification code
5. User enters verification code
6. System confirms email and completes registration
7. System creates user profile (via Post-Confirmation Trigger)
8. System redirects user to `/dashboard`

### 2.2 Login Flow
1. User navigates to `/auth/login`
2. User enters email and password
3. Amplify SDK authenticates with Cognito
4. If MFA enabled:
   - System prompts for OTP/TOTP code
   - User enters code
   - System validates and completes authentication
5. Cognito issues JWT tokens (access, ID, refresh)
6. System stores tokens and fetches user profile data from GraphQL
7. System redirects user to `/dashboard` (or original destination if redirected from protected route)

### 2.3 Logout Flow
1. User clicks logout action
2. System invalidates Cognito session
3. System clears client-side JWT tokens
4. System redirects user to `/auth/login`

### 2.4 Password Recovery Flow
1. User navigates to `/auth/reset-password`
2. User enters email address
3. System sends recovery code via email
4. User enters recovery code and new password
5. System validates code and updates password in Cognito
6. System redirects user to `/auth/login`

## 3. Technical Specifications

### 3.1 Data Models

#### 3.1.1 GraphQL User Profile

**Storage**: AWS AppSync + DynamoDB (application-specific data only)

**Architectural Note**: Following AWS Amplify best practices, this model stores **only application-specific data**, not authentication attributes. Identity attributes (email, email_verified, phone) remain in Cognito for security, compliance, and performance optimization.

**GraphQL Schema** (`apps/backend/amplify/data/resource.ts`):
```typescript
const schema = a.schema({
  UserProfile: a.model({
    email: a.string().required(),                     // Copied from Cognito for easier access
    avatarUrl: a.string(),                            // Profile picture URL
    fullName: a.string(),                             // Display name
    bio: a.string(),                                  // User bio
    preferences: a.json(),                            // UI preferences (theme, etc.)
    lastLoginAt: a.datetime(),                        // Last login timestamp
    status: a.enum(['active', 'suspended', 'deleted']), // Account status
  })
    .authorization([a.allow.owner()]),
});
```

**Access Pattern**: Retrieved via `useUser().userProfile` (from GraphQL, not Cognito)

**Important**: To access user email, use `userAttributes.email`, NOT `userProfile.email`

### 3.2 Types

#### 3.2.1 User State Schema

**Simplified Domain Model** (abstracts Amplify/Cognito internals):

```typescript
interface UserState {
  status: 'authenticated' | 'unauthenticated' | 'loading' | 'mfa_required'
  user: User | null                  // Authenticated user data
  profile: UserProfile | null        // GraphQL profile data
  error: AuthError | null            // Error details for UI display
}

interface User {
  id: string                         // Cognito sub (unique user ID)
  email: string
  emailVerified: boolean
  name?: string                      // Combined given_name + family_name
  phoneNumber?: string
  phoneNumberVerified?: boolean
}

interface UserProfile {
  // GraphQL profile: extended application-specific data
  // Fields defined by application requirements and extended by other layers
  preferences?: Record<string, any>
  metadata?: Record<string, any>
}

interface AuthError {
  code: string                       // Error code for programmatic handling
  message: string                    // User-friendly error message
  details?: any                      // Additional error context
}
```

**Rationale**: Abstracts Amplify SDK internals, exposes only domain-relevant data. Prevents tight coupling to Cognito implementation details.

#### 3.2.2 Cognito User Attributes

**Storage**: AWS Cognito User Pool (managed service, not stored in GraphQL/DynamoDB)

Standard Cognito attributes:
- `sub` - Unique user ID (UUID)
- `email` - User email address
- `email_verified` - Email verification status
- `given_name` - First name (optional)
- `family_name` - Last name (optional)
- `phone_number` - Phone with country code (optional)
- `phone_number_verified` - Phone verification status (optional)

**Access Pattern**: Retrieved via `useUser().userAttributes` (from Cognito, not GraphQL)

### 3.3 Composables

**`useUser()`**

**Universal composable** that works seamlessly in client, ssr and api routes contexts.

**Reactive State (Read-only)**
- `isAuthenticated: ComputedRef<boolean>` - Whether user is authenticated
- `authStep: ComputedRef<string>` - Current auth step ('initial', 'challengeOTP', 'challengeTOTPSetup', 'authenticated')
- `userAttributes: ComputedRef<object | null>` - Cognito user attributes (email, name, phone, etc.)
- `userProfile: ComputedRef<UserProfile | null>` - GraphQL profile data (extended application data)
- `authSession: ComputedRef<object | null>` - Current authentication session
- `tokens: ComputedRef<object | null>` - JWT tokens (access, ID, refresh)
- `currentUser: ComputedRef<object | null>` - Current authenticated user object
- `loading: ComputedRef<boolean>` - Loading state for async operations
- `error: ComputedRef<string | null>` - Error message if operation fails

**Computed Helpers**
- `isAuthenticated: ComputedRef<boolean>` - Convenience getter for authenticated state
- `isLoading: ComputedRef<boolean>` - Convenience getter: `loading === true`
- `requiresMFA: ComputedRef<boolean>` - Convenience getter: `authStep === 'challengeOTP' || authStep === 'challengeTOTPSetup'`

**Client-side Methods**
- `signUp(data: { username, password, attributes? }): Promise<any>` - Register new user with Cognito
- `signIn(credentials: { username, password }): Promise<any>` - Authenticate user with Cognito
- `confirmOTP(code: string): Promise<any>` - Complete MFA challenge (OTP/TOTP)
- `signOut(): Promise<void>` - End user session and clear tokens
- `resetPassword(username: string): Promise<{ success: boolean, error?: string }>` - Send password reset code via email
- `confirmResetPassword(username: string, code: string, newPassword: string): Promise<{ success: boolean, error?: string }>` - Complete password reset flow

**Universal Methods (Client & Server)**
- `fetchUser(event?: H3Event): Promise<void>` - Load complete user data (Cognito auth + GraphQL profile)
- `fetchUserProfile(event?: H3Event): Promise<void>` - Load only GraphQL profile data
- `updateAttributes(attributes: object): Promise<void>` - Update Cognito user attributes
- `updateUserProfile(profileData: object): Promise<void>` - Update GraphQL profile data (client-only; server should use direct GraphQL)

**Usage Examples**

```vue
<!-- Components (client & server) -->
<script setup>
const { isAuthenticated, user, signIn, signOut } = useUser()
</script>

<!-- Server API Routes -->
<script>
export default defineEventHandler(async (event) => {
  const { user, fetchUser } = useUser() // Same API, auto-isolated per request
  await fetchUser()
  return { userId: user.value?.id }
})
</script>

<!-- Pages -->
<script setup>
const { isAuthenticated, isLoading, user, profile } = useUser()
</script>
```

**Context Detection**
- **Client**: Uses Amplify SDK directly for auth operations
- **Server**: Uses `useRequestEvent()` to access H3 event and validate JWT tokens server-side
- **Automatic**: No need to choose between variants - single API works everywhere

### 3.4 Components

**`Authenticator`**

Multi-step authentication form component handling signin, signup, and email verification flows.

**Props**
- `state?: 'signin' | 'signup' | 'verify'` - Initial UI state (default: `'signin'`)
- `providers?: string[]` - External auth providers configuration (optional)
- `signInFields?: object[]` - Custom login form field configuration (optional)
- `signUpFields?: object[]` - Custom registration form field configuration (optional)
- `verifyFields?: object[]` - Custom verification form field configuration (optional)

**Events**
- `@signedIn` - Emitted when user successfully authenticates
- `@stateChange: (newState: string) => void` - Emitted when auth flow state changes

**Features**
- Multi-step form handling with state transitions
- MFA challenge UI (OTP/TOTP input)
- User-friendly error messages
- Loading states for async operations
- Form validation

**Usage Example**
```vue
<template>
  <Authenticator
    :state="'signin'"
    @signed-in="handleSignIn"
  />
</template>
```

**`UserProfileSettings`**

User profile editing component for updating user attributes and profile data.

**Features**
- Edit Cognito user attributes (name, phone number, etc.)
- Update GraphQL profile data
- Form validation
- Loading states and error handling
- Success feedback

**Usage Example**
```vue
<template>
  <UserProfileSettings />
</template>
```

### 3.5 Middlewares

**`auth`** (server and client)

Protect routes requiring authentication. Redirects unauthenticated users to login page.

**Behavior**
- Validates session via `useUser().fetchUser()`
- Redirects to `/auth/login?redirect=/original-path` if unauthenticated
- Works with both SSR and client-side navigation
- Preserves intended destination in redirect query parameter

**Usage**
```vue
<script setup>
definePageMeta({
  middleware: 'auth'
})
</script>
```

**Applied To**
- Dashboard pages
- Protected user areas
- Account management pages
- Any route requiring authentication

**`guest`** (server and client)

Redirect authenticated users away from auth pages to prevent logged-in users from accessing login/signup pages.

**Behavior**
- Checks authentication status via `useUser().fetchUser()`
- Redirects authenticated users to `/dashboard`
- Allows unauthenticated users to proceed
- Works with SSR and client-side navigation

**Usage**
```vue
<script setup>
definePageMeta({
  middleware: 'guest'
})
</script>
```

**Applied To**
- `/auth/login`
- `/auth/signup`
- `/auth/reset-password`
- Any auth-related page that shouldn't be accessible when logged in

### 3.6 Server Utilities

**`requireAuth(event)`** (server)

Direct authentication validation function for server API routes.

**Signature**
```typescript
requireAuth(event: H3Event): Promise<void>
```

**Behavior**
- Extracts JWT token from:
  1. Cookie: `amplify.idToken` (HTTP-only, primary for SSR)
  2. Authorization header: `Bearer <token>` (fallback for API calls)
- Verifies JWT signature using Cognito JWKS
- Validates token claims (expiration, issuer, audience)
- Throws appropriate error if invalid:
  - `401 Unauthorized`: Missing token
  - `498 Invalid Token`: Invalid signature or malformed token
  - `419 Token Expired`: Token expired
- Populates `useUser()` state if authenticated (per-request isolation)

**Returns**: `void` (throws error if authentication fails)

**Usage Example**
```typescript
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const { user, profile } = useUser()
  const userId = user.value?.id

  // Protected API logic here...
  return { data: 'protected data', userId }
})
```

**`withAuth(handler)`** (server)

Higher-order function that wraps event handlers with authentication validation.

**Signature**
```typescript
withAuth<T>(handler: (event: H3Event) => Promise<T> | T): EventHandler<T>
```

**Behavior**
- Validates authentication before executing handler
- Automatically applies `requireAuth()` check
- Cleaner syntax for fully protected endpoints

**Returns**: Wrapped event handler with authentication

**Usage Example**
```typescript
export default withAuth(async (event) => {
  const { user, profile } = useUser()

  // Handler is already authenticated
  return {
    userId: user.value?.id,
    email: user.value?.email,
    profile: profile.value
  }
})
```

**When to Use Which**
- Use `requireAuth()` for conditional authentication or granular control
- Use `withAuth()` for endpoints that always require authentication
- Use `useUser()` directly in components, pages, or when handling authentication yourself

### 3.7 Server Endpoints

The Auth Layer does **not** provide custom server API endpoints. All authentication operations (login, logout, signup, password reset) are handled client-side through AWS Amplify SDK communicating directly with AWS Cognito.


## 4. Testing

### 4.1 Unit Tests (Minimal)

**Scope**: Only pure utility functions without AWS dependencies

**Examples**:
- Token parsing logic (extract claims from JWT)
- Error message formatting
- Input validation (email format, password strength)
- State transformation helpers

**Tools**: Vitest

### 4.2 E2E Tests (Primary)

**Scope**: Complete user flows with real Cognito integration

**Test Cases**:

**Registration Flow**:
- User can register with email/password
- Email verification code is sent
- User can confirm email with valid code
- Invalid code shows appropriate error
- GraphQL profile is created (via Lambda trigger)
- User is redirected to dashboard

**Login Flow**:
- User can login with valid credentials
- Invalid credentials show error
- User is redirected to original destination after login
- Session persists across page reloads

**MFA Flow** (if enabled):
- User can setup TOTP authenticator
- User must complete MFA challenge on login
- Invalid MFA code shows error
- Valid MFA code completes login

**Password Reset Flow**:
- User can request password reset
- Reset code is sent via email
- User can set new password with valid code
- User can login with new password

**Route Protection**:
- Unauthenticated users redirected to login
- Authenticated users can access protected routes
- Auth pages redirect authenticated users to dashboard

**Logout Flow**:
- User can logout
- Session is cleared
- User is redirected to login
- Protected routes become inaccessible

**Tools**: Playwright (real browser testing)


## 5. Implementation

### 5.1 Layer Structure

Complete directory structure for the authentication layer following Nuxt Layers patterns and AGENTS.md standards:

```
layers/auth/
├── components/
│   └── Authenticator.vue           # Multi-step auth form (signin/signup/verify/MFA)
├── composables/
│   └── useUser.ts                  # Universal composable (client/SSR/API routes)
├── middleware/
│   ├── auth.ts                     # Protect authenticated routes (server + client)
│   └── guest.ts                    # Redirect authenticated users (server + client)
├── server/
│   └── utils/
│       ├── requireAuth.ts          # Direct auth validation for API routes
│       └── withAuth.ts             # HOF wrapper for protected endpoints
├── utils/
│   ├── token.ts                    # Token management utilities (storage, validation helpers)
│   └── errors.ts                   # Auth error types and formatting
├── types/
│   └── auth.d.ts                   # TypeScript definitions (UserState, User, AuthError)
├── nuxt.config.ts                  # Layer configuration
├── package.json                    # Package metadata (@starter-nuxt-amplify-saas/auth)
└── README.md                       # Public API documentation and usage examples
```

### 5.2 Definition of Done

**Acceptance Criteria**

- [ ] User can register with email/password
- [ ] User receives verification email and can confirm
- [ ] User can login with correct credentials
- [ ] User is redirected to `/dashboard` after login
- [ ] User can logout and session is cleared
- [ ] User can reset password via email
- [ ] Protected routes redirect unauthenticated users
- [ ] Auth pages redirect authenticated users to dashboard
- [ ] MFA challenge works for enabled accounts
- [ ] User profile data loads from GraphQL
- [ ] JWT tokens refresh automatically before expiration
- [ ] Server utilities validate authentication correctly
- [ ] Error messages are user-friendly

**Interfaces**

- [ ] `useUser()` composable is implemented
- [ ] `Authenticator` component is implemented
- [ ] `auth` middleware is implemented
- [ ] `guest` middleware is implemented
- [ ] `requireAuth()` utility is implemented
- [ ] `withAuth()` utility is implemented
- [ ] Token storage (cookies + localStorage) is implemented
- [ ] Server JWT validation with `jose` library is implemented

### 5.3 Plan

See [Auth Implementation Plan](../plan/auth.md).

## 6. Non-Functional Requirements

### 6.1 Security

**Provided by AWS Amplify/Cognito** (Managed Service):
- Token generation and signing (JWT with RS256 algorithm)
- Password policies (configurable in Cognito: min length, complexity, etc.)
- Multi-Factor Authentication (TOTP, SMS)
- OAuth/OIDC flows (Google, Facebook, GitHub social login)
- User pool encryption at rest (AWS KMS)
- HTTPS enforcement for all auth operations
- Account lockout policies (configurable failed login attempts)
