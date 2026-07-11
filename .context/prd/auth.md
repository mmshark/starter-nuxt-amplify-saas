# PRD: Authentication

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/auth.md

## Purpose & scope

`layers/auth` (published as `@mmshark/auth-layer`) provides authentication for the Nuxt 4 apps against AWS Cognito (Amplify Gen 2): registration with email verification, login/logout, password recovery, SSR-safe session state, route protection, and request authentication for Nitro API routes. The Cognito resource is defined in `apps/backend/amplify/auth/resource.ts` (`loginWith: { email: true }`, least-privilege group-management grants, `postConfirmation` trigger).

**Includes**: auth lifecycle (signup/verify, signin, signout, password recovery), Cognito integration via Amplify SSR adapter, route middleware, server auth utilities, user attribute/profile editing components, post-signup provisioning.

**Excludes**: authorization/RBAC/feature gating (entitlements layer), workspace membership (workspaces layer), billing (billing layer), transactional email beyond Cognito defaults.

## Requirements

### Functional

| # | Requirement | Notes |
|---|---|---|
| F1 | Register with email + password; email verification code; resend code | Confirmation required before first signin |
| F2 | Post-confirmation provisioning: `UserProfile` record, personal workspace, per-workspace Cognito groups, Stripe customer | Lambda trigger `apps/backend/amplify/auth/post-confirmation/handler.ts`; must be idempotent |
| F3 | Signin / signout; preserve intended destination across the login redirect | |
| F4 | Password recovery: request reset code by email, confirm code + new password | Two-step, unauthenticated |
| F5 | Authenticated password change (`updatePassword`) | Target — see Current status |
| F6 | Verified email change: `updateUserAttributes` → `sendUserAttributeVerificationCode` → `confirmUserAttribute` | Mandatory with `loginWith: email`; target — see Current status |
| F7 | Self-service account deletion (`deleteUser` + cleanup of personal workspace, `ws:*` groups, Stripe customer) | Target — see Current status |
| F8 | Session persists across reloads; identical behavior in SSR and client navigation | |
| F9 | Route protection: `auth` middleware for protected routes, `guest` middleware for auth pages | |
| F10 | Server-side request authentication for Nitro routes (`requireAuth` / `withAuth`) | |
| F11 | MFA (TOTP) and social login | Future; not implemented and not currently scheduled — see Current status |

### Data model

- **Identity attributes live in Cognito only** (User Pool): `sub`, `email`, `email_verified`, `given_name`, `family_name`, plus custom mutable `profilePicture` (`apps/backend/amplify/auth/resource.ts`). They are not duplicated into DynamoDB. Access via `useUser().userAttributes`.
- **`UserProfile`** (AppSync/DynamoDB, `apps/backend/amplify/data/resource.ts`): application-specific data keyed by `userId`. Current schema is intentionally minimal — `userId` + `stripeCustomerId` — and **owner access is read-only**; the only writer is the post-confirmation Lambda. Any feature needing user-writable profile fields (preferences, onboarding progress) must add fields *and* an authorized write path (mutation or server route). The rich schema in the old PRD (`avatarUrl`, `fullName`, `bio`, `preferences`, `lastLoginAt`, `status`) was never built and is not a commitment.

### API surface

Composable — `useUser()` (client/SSR) and `useUserServer()` (server-side helper), `layers/auth/composables/useUser.ts`:

| Member | Behavior |
|---|---|
| State | `useState`-backed, per-request isolated; JWTs are never serialized into the SSR payload |
| `signUp`, `signIn`, `signOut` | Amplify Auth against Cognito (client-side) |
| `resetPassword`, `confirmResetPassword` | Two-step recovery (F4), returns `{ success, error? }` |
| `updateAttributes` | Cognito attribute update; client-only (throws on server) |
| `fetchUser`, `fetchUserProfile` | Load Cognito session/attributes + `UserProfile` (profile via `GET /api/profile`, since the model is owner-read-only) |
| `updateUserProfile` | Profile write path — currently ends in a deliberate 501, see below |

Components (`layers/auth/components/`): `Authenticator.vue` (multi-step signin/signup/verify with code resend), `UserProfileSettings.vue` (given/family name with Zod validation), `UserAccountForm.vue` (email editing — broken today, see Current status).

Middleware (`layers/auth/middleware/`): `auth.ts`, `guest.ts` — SSR + client.

Server utilities (`layers/auth/server/utils/auth.ts`): `requireAuth(event)` resolves the Amplify SSR session from request cookies (`withAmplifyAuth` + `fetchAuthSession`), attaches `{ userId, email }` to `event.context.user`, throws 401 when unauthenticated; `withAuth(handler)` is the HOF wrapper. Token verification is performed by the Amplify SSR adapter — there is **no custom `jose` JWT verification and no dual localStorage/HTTP-only-cookie storage**; the old PRD's claims to that effect described code that never existed and are dropped as requirements.

Server endpoints (`layers/auth/server/api/`): `GET /api/profile` (own `UserProfile`); `PUT /api/profile` returns a deliberate 501 because the model has no authorized write path yet.

Pages consuming the layer (`layers/saas/pages/auth/`): `login.vue`, `signup.vue`, `forgot-password.vue`. Account pages: `layers/saas/pages/profile/` (`index`, `account`, `security`, `notifications`).

### Non-functional

- SSR safety: per-request state isolation, no token leakage into the rendered payload.
- Security posture delegated to Cognito: password policy, token signing (RS256), default throttling, encryption at rest.
- Testing: E2E-first (Playwright) for signup/signin/route-protection; unit tests only for pure utilities.

## Current status

Audit 2026-07-08, sections `auth` (impl 3/5, quality 4/5) and `profile` (impl 2/5, quality 3/5).

| Capability | Status | Evidence |
|---|---|---|
| Signup + email verification + resend (F1) | **Working** | `layers/auth/components/Authenticator.vue`; E2E does *real* email verification via Gmail IMAP (`apps/saas/tests/e2e/helpers/auth.js`, `verifyEmail`) |
| Post-confirmation provisioning (F2) | **Working, fragile** | `apps/backend/amplify/auth/post-confirmation/handler.ts` — creates profile/workspace/groups/Stripe customer, idempotent on groups; swallows all errors (see risks) |
| Signin / signout (F3) | **Working** | Signout wired in the single layer-owned `layers/saas/components/UserMenu.vue` |
| Password recovery (F4) | **Working** | `layers/saas/pages/auth/forgot-password.vue` with real submit handlers for both steps |
| SSR-safe `useUser()`/`useUserServer()` | **Working** | `layers/auth/composables/useUser.ts` |
| `auth`/`guest` middleware (F9) | **Working** | `layers/auth/middleware/auth.ts`, `guest.ts` |
| `requireAuth`/`withAuth` (F10) | **Working** | `layers/auth/server/utils/auth.ts`; 401 only (no 419/498 codes as the old PRD claimed) |
| `GET /api/profile` | **Working** | `layers/auth/server/api/profile.get.ts` |
| `PUT /api/profile` | **Deliberate 501** | `layers/auth/server/api/profile.put.ts`; `UserProfile` is Lambda-write-only |
| Name editing | **Working** | `layers/auth/components/UserProfileSettings.vue` → `updateAttributes` (given_name/family_name) |
| Email change (F6) | **Broken** | `layers/auth/components/UserAccountForm.vue` submits `updateAttributes({ email })` and shows a success toast, but `confirmUserAttribute`/`sendUserAttributeVerificationCode` exist **nowhere in the repo**, and `updateAttributes` discards the verification next-step returned by Amplify. Email is left unverified — the login identifier |
| Password change (F5) | **Not implemented** | `layers/saas/pages/profile/security.vue` is a stub: form has no `@submit` handler; no `updatePassword` call anywhere |
| Account deletion (F7) | **Not implemented** | Delete button has no handler; no `deleteUser`, no cleanup Lambda |
| MFA (TOTP/SMS) | **Not implemented** | No MFA config in `defineAuth`, no `confirmSignIn` flow, no OTP UI; the old `confirmOTP` was removed as dead aws-amplify v5 code. The old PRD documented MFA as an existing capability — it never was |
| `jose` JWT validation, dual token storage | **Never existed** | Old-PRD drift; server auth is Amplify SSR cookie-based (see API surface) |
| Social login / magic links | **Not implemented** | No `externalProviders`, no OAuth callback; `Authenticator`'s `providers` prop is an empty passthrough |
| Avatar | **Not implemented** | No Amplify Storage resource; the `picture`/`profilePicture` attribute is never written |
| Anti-abuse | **Cognito defaults only** | No threat protection / CAPTCHA / custom rate limiting |
| Dead code | — | `isProtectedRoute` in `layers/auth/utils/index.ts` is exported but unused |

## Open issues & risks

- **Tokens in JS-readable cookies**: Cognito tokens, including the refresh token, are stored in non-HttpOnly cookies (inherent to the Amplify JS SSR adapter). An XSS exfiltrates the full session. Mitigation is CSP/hardening (roadmap E12), not a storage change.
- **Silent provisioning failure**: the post-confirmation handler catches and swallows every error so registration never fails — a user can end up confirmed with no `UserProfile`, workspace, or Stripe customer, with no retry/compensation mechanism.
- **Account-management gap**: E02 disabled/removed misleading email/password/delete controls. The
  authenticated password change, verified email change and account deletion flows remain E07 scope.
- **Unbranded Cognito emails**: verification/reset emails use Cognito defaults (no SES sender, no CustomMessage trigger) — E04.
- **MFA gap**: MFA is absent and no roadmap epic currently covers it; if it becomes a requirement it needs to be added to the roadmap (natural fit: E12 security-hardening).

## Related

- [Roadmap](../prd/roadmap.md) — completed E02 neutralized the ghost controls; Next epics E04, E07 and E12 own branded emails, account management and security hardening.
- Layer API reference: `layers/auth/README.md`.
- Backend auth resource: `apps/backend/amplify/auth/resource.ts`; provisioning trigger: `apps/backend/amplify/auth/post-confirmation/handler.ts`.
- Superseded source: `doc/prd/auth.md` (contains the drift corrected here).
