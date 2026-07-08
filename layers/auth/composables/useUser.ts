import type { H3Event, EventHandlerRequest } from 'h3'
import type { SignInInput, SignUpInput, UpdateUserAttributesInput } from 'aws-amplify/auth'
import { handleAuthError } from '../utils'

// Base state: Use useState for SSR-safe, per-request state. Every ref here
// (including authSession/tokens) MUST be a useState — a module-scope ref
// would be a singleton shared across every concurrent request handled by
// the same server process, leaking one user's session into another user's
// SSR render. authSession/tokens additionally carry raw JWTs (incl. the
// refresh token); they are only ever populated on the client (see
// `fetchUser` below) so a JWT is never written into the SSR payload.
const useUserState = () => ({
  isAuthenticated: useState<boolean>('user:isAuthenticated', () => false),
  authStep: useState<string>('user:authStep', () => 'initial'),
  authSession: useState<any>('user:authSession', () => null),
  tokens: useState<any>('user:tokens', () => null),
  currentUser: useState<any>('user:currentUser', () => null),
  userAttributes: useState<any>('user:userAttributes', () => null),
  userProfile: useState<any>('user:userProfile', () => null),
  loading: useState<boolean>('user:loading', () => false),
  error: useState<string | null>('user:error', () => null)
})

/**
 * Composable for managing user authentication and profile data using AWS Amplify
 *
 * Provides reactive state and methods for handling user authentication flows and data:
 *
 * @example Basic Usage
 * ```ts
 * const { signIn, isAuthenticated, userAttributes } = useUser()
 *
 * // Sign in
 * await signIn({
 *   username: 'user@example.com',
 *   password: 'password123'
 * })
 *
 * // Access user data
 * console.log(userAttributes.value.email)
 * ```
 *
 * @example Basic Server Usage
 * ```ts
 * const { fetchUser, isAuthenticated, userProfile } = useUserServer()
 *
 * await fetchUser(event)
 *
 * if (isAuthenticated.value) {
 *   ...
 * }
 * ```
 *
 * @returns {Object} User authentication state and methods
 * @property {ComputedRef<boolean>} isAuthenticated - Whether user is authenticated
 * @property {ComputedRef<string>} authStep - Current auth step ('initial', 'authenticated', or a Cognito
 *   `nextStep.signInStep` value if `signIn()` returned `isSignedIn: false` — MFA challenges are not
 *   completed by this composable yet, see the note above `signIn()`)
 * @property {ComputedRef<Object|null>} userAttributes - Cognito user attributes (email, name, etc)
 * @property {ComputedRef<Object|null>} userProfile - User profile data (via `/api/profile`)
 * @property {ComputedRef<Object|null>} authSession - Current authentication session (client-only; never populated on the server)
 * @property {ComputedRef<Object|null>} tokens - JWT tokens (client-only; never populated on the server)
 * @property {ComputedRef<Object|null>} currentUser - Current authenticated user object
 * @property {ComputedRef<boolean>} loading - Loading state for async operations
 * @property {ComputedRef<string|null>} error - Error message if operation fails
 * @method signUp - Register a new user and handle multi-step flow (client-side only)
 * @method signIn - Sign in user (client-side only); see the MFA note above its implementation
 * @method signOut - Sign out the current user (client-side only)
 * @method updateAttributes - Update Cognito user attributes (client-side only; throws on the server)
 * @method fetchUser - Fetch latest user data information (works universally on both client and server)
 */

const _useUser = () => {
  // Create new state instance for this composable instance
  const userState = useUserState()

  /**
   * Serialize tokens to plain object (remove functions)
   */
  const serializeTokens = (tokens: any) => {
    if (!tokens) return null
    return {
      accessToken: tokens.accessToken?.toString() || null,
      idToken: tokens.idToken?.toString() || null,
      signInDetails: tokens.signInDetails || null
    }
  }

  /**
   * Serialize auth session to plain object (remove functions)
   */
  const serializeAuthSession = (authSession: any) => {
    if (!authSession) return null
    return {
      tokens: serializeTokens(authSession.tokens),
      credentials: authSession.credentials || null,
      identityId: authSession.identityId || null,
      userSub: authSession.userSub || null
    }
  }

  /**
   * Serialize current user to plain object (remove functions)
   */
  const serializeCurrentUser = (currentUser: any) => {
    if (!currentUser) return null
    return {
      username: currentUser.username || null,
      userId: currentUser.userId || null,
      signInDetails: currentUser.signInDetails || null
    }
  }

  /**
   * Sign up a new user and handle multi-step flow
   */
  const signUp = async (data: SignUpInput) => {
    if (import.meta.server) {
      throw new Error('signUp can only be called on the client side')
    }

    // Capture useNuxtApp before async operations
    const nuxtApp = useNuxtApp()

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await nuxtApp.$Amplify.Auth.signUp(data)
      userState.authStep.value = result.nextStep?.signUpStep || 'authenticated'
      return result
    } catch (err) {
      console.error('Error signing up:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Sign in user and handle the aws-amplify v6 sign-in result shape:
   * `{ isSignedIn, nextStep }` (there is no `result.user`/`result.challengeName`
   * — those are aws-amplify v5, which this project does not run).
   *
   * MFA: future. No Cognito MFA is configured for this starter kit, so
   * `nextStep.signInStep` values other than `DONE` (e.g.
   * `CONFIRM_SIGN_IN_WITH_SMS_CODE`, `CONFIRM_SIGN_IN_WITH_TOTP_CODE`,
   * `CONTINUE_SIGN_IN_WITH_MFA_SETUP`) are surfaced via `authStep` but not
   * completed by this composable. Wiring real MFA requires: branching on
   * `nextStep.signInStep` here, an OTP entry step in `Authenticator.vue`,
   * and calling `confirmSignIn({ challengeResponse: code })`.
   */
  const signIn = async (credentials: SignInInput) => {
    if (import.meta.server) {
      throw new Error('signIn can only be called on the client side')
    }

    // Capture useNuxtApp before async operations
    const nuxtApp = useNuxtApp()

    userState.loading.value = true
    userState.error.value = null

    try {
      const { isSignedIn, nextStep } = await nuxtApp.$Amplify.Auth.signIn(credentials)

      if (isSignedIn) {
        userState.authStep.value = 'authenticated'
        const currentUser = await nuxtApp.$Amplify.Auth.getCurrentUser()
        userState.currentUser.value = serializeCurrentUser(currentUser)
        await fetchUser()
      } else {
        // MFA: future — see note above. Not handled today.
        userState.authStep.value = nextStep?.signInStep || 'initial'
      }

      return { isSignedIn, nextStep }
    } catch (err) {
      console.error('Error signing in:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  // MFA: future. The previous `confirmOTP` here was written against the
  // aws-amplify v5 sign-in shape (`result.challengeName`,
  // `confirmSignIn(code: string)`), neither of which exists in v6 — it was
  // unreachable dead code (nothing in `signIn` ever set `authStep` to a
  // value it checked for, and no component called it). No Cognito MFA is
  // configured for this starter kit to build/verify a real v6 flow against,
  // so it has been removed rather than left in a broken, unreachable state.
  // To add MFA: branch on `nextStep.signInStep` in `signIn()` above
  // (`CONFIRM_SIGN_IN_WITH_SMS_CODE` / `CONFIRM_SIGN_IN_WITH_TOTP_CODE` /
  // `CONTINUE_SIGN_IN_WITH_MFA_SETUP`), add an OTP step to
  // `Authenticator.vue`, and call `confirmSignIn({ challengeResponse: code })`.

  /**
   * Reset password - send reset code to email
   */
  const resetPassword = async (username: string) => {
    if (import.meta.server) {
      throw new Error('resetPassword can only be called on the client side')
    }

    // Capture useNuxtApp before async operations
    const nuxtApp = useNuxtApp()

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await nuxtApp.$Amplify.Auth.resetPassword({ username })
      return { success: true, nextStep: result.nextStep }
    } catch (err) {
      console.error('Error resetting password:', err)
      userState.error.value = handleAuthError(err)
      return { success: false, error: handleAuthError(err) }
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Confirm password reset with code
   */
  const confirmResetPassword = async (username: string, confirmationCode: string, newPassword: string) => {
    if (import.meta.server) {
      throw new Error('confirmResetPassword can only be called on the client side')
    }

    // Capture useNuxtApp before async operations
    const nuxtApp = useNuxtApp()

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await nuxtApp.$Amplify.Auth.confirmResetPassword({
        username,
        confirmationCode,
        newPassword
      })
      return { success: true }
    } catch (err) {
      console.error('Error confirming password reset:', err)
      userState.error.value = handleAuthError(err)
      return { success: false, error: handleAuthError(err) }
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Sign out current user
   */
  const signOut = async () => {
    if (import.meta.server) {
      throw new Error('signOut can only be called on the client side')
    }

    // Capture useNuxtApp before async operations
    const nuxtApp = useNuxtApp()

    userState.loading.value = true
    userState.error.value = null

    try {
      await nuxtApp.$Amplify.Auth.signOut()
      userState.isAuthenticated.value = false
      userState.authStep.value = 'initial'
      userState.userAttributes.value = null
      userState.userProfile.value = null
      userState.authSession.value = null
      userState.tokens.value = null
      userState.currentUser.value = null
    } catch (err) {
      console.error('Error signing out:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Update Cognito user attributes
   */
  const updateAttributes = async (attributes: UpdateUserAttributesInput) => {
    // Capture useNuxtApp before async operations
    const nuxtApp = useNuxtApp()

    userState.loading.value = true
    userState.error.value = null

    try {
      if (import.meta.server) {
        // Cognito attribute updates require a client-side Amplify Auth call
        // (there is no server-side equivalent wired here). Fail loudly
        // instead of the previous `console.log('TODO...')`, which silently
        // reported success without doing anything.
        throw new Error('updateAttributes() is not supported on the server; call it from client-side code')
      }

      await nuxtApp.$Amplify.Auth.updateUserAttributes(attributes)
      await fetchUser()
    } catch (err) {
      console.error('Error updating attributes:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Fetch user profile data via the server-side `/api/profile` route.
   *
   * Fetches through Nitro (not a direct GraphQL call from the client)
   * because `UserProfile` is owner-*read*-only in the data schema and the
   * previous implementation imported `../../amplify/utils/graphql/queries`,
   * a module that does not exist in this layer.
   */
  const fetchUserProfile = async (event?: H3Event<EventHandlerRequest>) => {
    if (!userState.isAuthenticated.value || !userState.userAttributes.value?.sub) {
      return
    }

    try {
      // On the server, forward the incoming request's cookies so the Nitro
      // route can authenticate the call; on the client, cookies are sent
      // automatically by the browser.
      const requestEvent = event || (import.meta.server ? useRequestEvent() : undefined)
      const result = await $fetch<{ profile: any }>('/api/profile', {
        headers: requestEvent?.headers
      })
      userState.userProfile.value = result?.profile || null
    } catch (err) {
      console.error('Error fetching user profile:', err)
      userState.userProfile.value = null
    }
  }

  /**
   * Update user profile data via the server-side `PUT /api/profile` route.
   *
   * `UserProfile`'s only owner-writable path is through a privileged
   * server route (the model itself is owner-read-only; see
   * `apps/backend/amplify/data/resource.ts`), so this can never be a direct
   * client-side GraphQL mutation. See `layers/auth/server/api/profile.put.ts`
   * for the current state of that write path (today it fails closed — there
   * is no user-editable field on `UserProfile` yet).
   */
  const updateUserProfile = async (profileData: any) => {
    if (!userState.isAuthenticated.value || !userState.userAttributes.value?.sub) {
      throw new Error('User not authenticated')
    }

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await $fetch<{ profile: any }>('/api/profile', {
        method: 'PUT',
        body: profileData
      })
      userState.userProfile.value = result?.profile || null
      return result
    } catch (err) {
      console.error('Error updating user profile:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Fetch all user data including session, tokens, and attributes
   */
  const fetchUser = async (event?: H3Event<EventHandlerRequest>) => {
    // Capture useNuxtApp BEFORE any async operations to preserve Nuxt context
    const nuxtApp = useNuxtApp()

    userState.loading.value = true
    userState.error.value = null

    try {
      // Get current auth session
      const authSession = await nuxtApp.$Amplify.Auth.fetchAuthSession()
      userState.isAuthenticated.value = authSession.tokens !== undefined

      // authSession/tokens carry raw JWTs (incl. the refresh token). Never
      // populate them on the server — useState is serialized into the SSR
      // payload (window.__NUXT__), so doing so would ship the current
      // request's tokens to the browser's page source unnecessarily. They
      // are only meaningful/cached client-side (e.g. for Authorization
      // headers in ad hoc client requests).
      if (import.meta.client) {
        userState.authSession.value = serializeAuthSession(authSession)
        userState.tokens.value = userState.isAuthenticated.value ? serializeTokens(authSession.tokens) : null
      }

      if (userState.isAuthenticated.value) {
        // Get current user
        const currentUser = await nuxtApp.$Amplify.Auth.getCurrentUser()
        userState.currentUser.value = serializeCurrentUser(currentUser)

        // Get user attributes
        const userAttributes = await nuxtApp.$Amplify.Auth.fetchUserAttributes()
        userState.userAttributes.value = userAttributes

        // Get profile data from our own API (not a direct GraphQL call)
        await fetchUserProfile(event)
      } else {
        userState.currentUser.value = null
        userState.userAttributes.value = null
        userState.userProfile.value = null
      }

      // Return data for server-side usage if needed
      if (import.meta.server) {
        return {
          isAuthenticated: userState.isAuthenticated.value,
          currentUser: userState.currentUser.value,
          userAttributes: userState.userAttributes.value,
          userProfile: userState.userProfile.value
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      userState.error.value = handleAuthError(err)
    } finally {
      userState.loading.value = false
    }
  }

  return {
    // State (already reactive via useState)
    ...userState,
    // Methods
    signUp,
    signIn,
    signOut,
    resetPassword,
    confirmResetPassword,
    updateAttributes,
    updateUserProfile,
    fetchUser,
    fetchUserProfile
  }
}

// NOTE: intentionally NOT wrapped in `createSharedComposable`. That wrapper
// memoizes a single instance for the lifetime of the Nuxt app instance —
// on the server, one Nuxt app instance can be reused/pooled across
// concurrent requests, which would leak one request's user state into
// another's. Every call to `useUser()` returns the same underlying
// `useState` refs (useState already dedupes by key), so there is no loss of
// reactivity/sharing on the client; this only removes the server-side
// cross-request leak risk.
export const useUser = _useUser

export const useUserServer = () => {
  if (import.meta.client) {
    throw new Error('useUserServer() should only be used on the server')
  }

  return _useUser()
}