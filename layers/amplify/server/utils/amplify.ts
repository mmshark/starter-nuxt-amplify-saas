import type { H3Event, EventHandlerRequest } from 'h3'
import { parseCookies } from 'h3'
import {
  createKeyValueStorageFromCookieStorageAdapter,
  createUserPoolsTokenProvider,
  createAWSCredentialsAndIdentityIdProvider,
  runWithAmplifyServerContext
} from 'aws-amplify/adapter-core'
import { parseAmplifyConfig } from 'aws-amplify/utils'
import { generateClient } from 'aws-amplify/data/server'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/schema'
import type { LibraryOptions } from '@aws-amplify/core'

import outputs from '../../amplify_outputs.json'

// Parse the content of amplify_outputs.json into the shape of ResourceConfig
export const amplifyConfig = parseAmplifyConfig(outputs)

// Create the Amplify used token cookies names array
const userPoolClientId = amplifyConfig.Auth!.Cognito.userPoolClientId
const lastAuthUserCookieName = 'CognitoIdentityServiceProvider.' + userPoolClientId + '.LastAuthUser'

const getAmplifyAuthKeys = (lastAuthUser: string) =>
  ['idToken', 'accessToken', 'refreshToken', 'clockDrift']
    .map(
      key =>
        'CognitoIdentityServiceProvider.' + userPoolClientId + '.' + lastAuthUser + '.' + key
    )
    .concat(lastAuthUserCookieName)

/**
 * Creates a key-value storage adapter from cookies extracted from H3Event
 * This replicates the same cookie handling logic used in the Nuxt plugin
 */
const createCookieStorageFromEvent = (event: H3Event<EventHandlerRequest>) => {
  const cookies = parseCookies(event)

  // Get the last auth user from cookies
  const lastAuthUser = cookies[lastAuthUserCookieName]
  const authKeys = lastAuthUser ? getAmplifyAuthKeys(lastAuthUser) : []

  // Create a map of auth cookies
  const amplifyCookies: Record<string, string | undefined> = {}
  authKeys.forEach(key => {
    amplifyCookies[key] = cookies[key]
  })

  return createKeyValueStorageFromCookieStorageAdapter({
    get(name) {
      const value = amplifyCookies[name]
      if (value) {
        return { name, value }
      }
      return undefined
    },
    getAll() {
      return Object.entries(amplifyCookies).map(([name, value]) => {
        return { name, value: value ?? undefined }
      })
    },
    set(name, value) {
      // In server context, we don't update cookies during the request
      // This would be handled by the response headers if needed
      amplifyCookies[name] = value
    },
    delete(name) {
      // `name` is a token-storage key (idToken/accessToken/refreshToken/
      // clockDrift) supplied by the Amplify adapter-core contract, not user
      // input; setting it to `undefined` instead of deleting it would leave
      // the key present in `getAll()`'s enumeration, which the Amplify
      // cookie storage adapter treats as "cookie exists" — this is auth
      // session/token storage, left as-is rather than reshaped for this
      // lint pass.
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete amplifyCookies[name]
    }
  })
}

/**
 * Creates LibraryOptions for authenticated Amplify operations
 * This replicates the same token provider setup used in the Nuxt plugin
 */
const createLibraryOptions = (event: H3Event<EventHandlerRequest>): LibraryOptions => {
  const keyValueStorage = createCookieStorageFromEvent(event)

  // Create a token provider
  const tokenProvider = createUserPoolsTokenProvider(
    amplifyConfig.Auth!,
    keyValueStorage
  )

  // Create a credentials provider
  const credentialsProvider = createAWSCredentialsAndIdentityIdProvider(
    amplifyConfig.Auth!,
    keyValueStorage
  )

  return {
    Auth: {
      tokenProvider,
      credentialsProvider
    }
  }
}

/**
 * Execute an Amplify Data operation with authenticated user context
 *
 * This follows the official Amplify SSR pattern using runWithAmplifyServerContext
 * with proper authentication token handling from cookies.
 *
 * @param event H3Event from the API route handler
 * @param callback Function that receives the authenticated Data client
 * @returns Promise with the result of the callback
 *
 * @example
 * ```typescript
 * // In a server API route
 * export default defineEventHandler(async (event) => {
 *   return await withAmplifyAuth(event, async (contextSpec) => {
 *     const client = generateClient<Schema>({ authMode: 'userPool' })
 *     const { data } = await client.models.UserProfile.get(contextSpec, { userId })
 *     return { success: true, data }
 *   })
 * })
 * ```
 */
export const withAmplifyAuth = async <T>(
  event: H3Event<EventHandlerRequest>,
  callback: (contextSpec: any) => T | Promise<T>
): Promise<T> => {
  const libraryOptions = createLibraryOptions(event)

  return runWithAmplifyServerContext<T>(
    amplifyConfig,
    libraryOptions,
    callback
  )
}

/**
 * Execute an Amplify Data operation without authentication (public access)
 *
 * This is useful for operations that don't require user authentication,
 * such as fetching public content or handling webhooks.
 *
 * @param callback Function that receives the public Data client
 * @returns Promise with the result of the callback
 *
 * @example
 * ```typescript
 * // In a server API route for public data
 * export default defineEventHandler(async (event) => {
 *   return await withAmplifyPublic(async (contextSpec) => {
 *     const client = generateClient<Schema>({ authMode: 'apiKey' })
 *     const { data } = await client.models.SubscriptionPlan.list(contextSpec, {
 *       filter: { isActive: { eq: true } }
 *     })
 *     return { success: true, data }
 *   })
 * })
 * ```
 */
/**
 * Sessionless server context for PUBLIC (apiKey) reads only. It deliberately
 * carries NO credentials provider: there is no guest/IAM identity to
 * authenticate as, so it cannot reach any tenant data. (The previous
 * guest-credentials wiring existed solely so the old Nitro webhook proxy
 * could invoke the stripe-webhook Lambda; the webhook is now a direct,
 * signature-verified Lambda Function URL — see
 * `apps/backend/amplify/functions/stripe-webhook/`.)
 */
export const withAmplifyPublic = async <T>(
  callback: (contextSpec: any) => T | Promise<T>
): Promise<T> => {
  return runWithAmplifyServerContext<T>(
    amplifyConfig,
    {},
    callback
  )
}

/**
 * Custom Amplify outputs (the `custom` block written via `backend.addOutput()`
 * in `apps/backend/amplify/backend.ts`). Used to look up deploy-time values
 * that aren't part of the standard Amplify outputs shape, e.g. the name of
 * the `workspace-membership` function that the workspace routes invoke.
 */
export const amplifyOutputs = outputs as unknown as {
  custom?: Record<string, string>
}

/**
 * Create a preconfigured Data client for server-side public (apiKey) operations.
 * Use together with withAmplifyPublic to provide contextSpec for calls.
 *
 * USE CASES:
 * ==========
 * - Stripe webhooks that need to update subscription data
 * - Public API endpoints that don't require user authentication
 * - Server background jobs that operate without user context
 * - Operations with @auth(allow: "public", provider: "apiKey") rules
 *
 * IMPORTANT:
 * ==========
 * This uses authMode: 'apiKey' which bypasses user authentication. Only use for:
 * 1. Public data that anyone can access
 * 2. Server-to-server operations (webhooks, background jobs)
 * 3. Operations that don't need to know WHO the user is
 *
 * @example Stripe webhook handler
 * ```typescript
 * // server/api/webhooks/stripe.post.ts
 * import { withAmplifyPublic, getServerPublicDataClient } from '#amplify/server/utils/amplify'
 *
 * export default defineEventHandler(async (event) => {
 *   const stripeEvent = await readBody(event)
 *
 *   // Verify stripe signature first!
 *   // ... signature verification code ...
 *
 *   return await withAmplifyPublic(async (contextSpec) => {
 *     const client = getServerPublicDataClient()
 *
 *     // Update subscription status (public apiKey access)
 *     const { data, errors } = await client.models.UserSubscription.update(contextSpec, {
 *       userId: stripeEvent.customer,
 *       status: stripeEvent.subscription_status,
 *       currentPeriodEnd: new Date(stripeEvent.current_period_end * 1000).toISOString()
 *     })
 *
 *     if (errors) throw new Error('Failed to update subscription')
 *     return { success: true, data }
 *   })
 * })
 * ```
 *
 * @example Public API endpoint
 * ```typescript
 * // server/api/public/plans.get.ts
 * import { withAmplifyPublic, getServerPublicDataClient } from '#amplify/server/utils/amplify'
 *
 * export default defineEventHandler(async (event) => {
 *   return await withAmplifyPublic(async (contextSpec) => {
 *     const client = getServerPublicDataClient()
 *
 *     // List active subscription plans (public access)
 *     const { data, errors } = await client.models.SubscriptionPlan.list(contextSpec, {
 *       filter: { isActive: { eq: true } }
 *     })
 *
 *     if (errors) throw createError({ statusCode: 500, message: 'Failed to fetch plans' })
 *     return { plans: data }
 *   })
 * })
 * ```
 */
export const getServerPublicDataClient = () => {
  // @ts-expect-error aws-amplify v6 server generateClient options type omits authMode; runtime unchanged (revisit E02/E10)
  return generateClient<Schema>({ config: amplifyConfig, authMode: 'apiKey' })
}

/**
 * Create a preconfigured Data client for server-side userPool operations.
 * Use together with withAmplifyAuth to provide contextSpec for calls.
 *
 * USE CASES:
 * ==========
 * - User-specific data operations (profile, subscriptions)
 * - Operations requiring owner-based authorization
 * - Any operation where you need to know the authenticated user's identity
 * - Operations with @auth(allow: "owner", provider: "userPools") rules
 * - Operations with @auth(allow: "private") rules
 *
 * IMPORTANT:
 * ==========
 * This uses authMode: 'userPool' which requires an authenticated user session.
 * The user's JWT token must be present in cookies, or the request will fail.
 *
 * @example Authenticated user profile fetch
 * ```typescript
 * // server/api/profile.get.ts
 * import { withAmplifyAuth, getServerUserPoolDataClient } from '#amplify/server/utils/amplify'
 *
 * export default defineEventHandler(async (event) => {
 *   // This requires user to be authenticated (JWT token in cookies)
 *   return await withAmplifyAuth(event, async (contextSpec) => {
 *     const client = getServerUserPoolDataClient()
 *
 *     // Get the authenticated user from the session
 *     const { $Amplify } = useNuxtApp()
 *     const currentUser = await $Amplify.Auth.getCurrentUser()
 *
 *     // Fetch user's profile (owner-based access)
 *     const { data, errors } = await client.models.UserProfile.get(contextSpec, {
 *       userId: currentUser.username
 *     })
 *
 *     if (errors) throw createError({ statusCode: 500, message: 'Failed to fetch profile' })
 *     if (!data) throw createError({ statusCode: 404, message: 'Profile not found' })
 *
 *     return { profile: data }
 *   })
 * })
 * ```
 *
 * @example Update user subscription
 * ```typescript
 * // server/api/subscription/cancel.post.ts
 * import { withAmplifyAuth, getServerUserPoolDataClient } from '#amplify/server/utils/amplify'
 *
 * export default defineEventHandler(async (event) => {
 *   return await withAmplifyAuth(event, async (contextSpec) => {
 *     const client = getServerUserPoolDataClient()
 *     const { $Amplify } = useNuxtApp()
 *     const currentUser = await $Amplify.Auth.getCurrentUser()
 *
 *     // Cancel user's subscription (owner-based access)
 *     const { data, errors } = await client.models.UserSubscription.update(contextSpec, {
 *       userId: currentUser.username,
 *       cancelAtPeriodEnd: true
 *     })
 *
 *     if (errors) throw createError({ statusCode: 500, message: 'Failed to cancel subscription' })
 *     return { success: true, subscription: data }
 *   })
 * })
 * ```
 *
 * @example Server middleware with auth check
 * ```typescript
 * // server/middleware/auth.ts
 * import { withAmplifyAuth, getServerUserPoolDataClient } from '#amplify/server/utils/amplify'
 *
 * export default defineEventHandler(async (event) => {
 *   // Only protect API routes
 *   if (!event.path.startsWith('/api/protected/')) return
 *
 *   try {
 *     await withAmplifyAuth(event, async (contextSpec) => {
 *       const { $Amplify } = useNuxtApp()
 *       const session = await $Amplify.Auth.fetchAuthSession()
 *
 *       if (!session.tokens) {
 *         throw createError({ statusCode: 401, message: 'Unauthorized' })
 *       }
 *
 *       // Attach user info to event context
 *       event.context.userId = session.userSub
 *       event.context.userEmail = session.tokens.idToken?.payload.email
 *     })
 *   } catch (error) {
 *     throw createError({ statusCode: 401, message: 'Authentication required' })
 *   }
 * })
 * ```
 */
export const getServerUserPoolDataClient = () => {
  // @ts-expect-error aws-amplify v6 server generateClient options type omits authMode; runtime unchanged (revisit E02/E10)
  return generateClient<Schema>({ config: amplifyConfig, authMode: 'userPool' })
}

/*
 * NOTE — there is deliberately NO IAM ('iam' authMode) data client here.
 *
 * The previous `getServerIamDataClient` existed to satisfy
 * `allow.authenticated('identityPool')` rules on the tenant models. That rule
 * authorized EVERY authenticated Cognito principal (any signed-in user's
 * browser could call AppSync directly with their identity-pool credentials
 * and bypass the routes' OWNER/ADMIN checks), so it was removed.
 *
 * Tenant models are now protected by the group-per-workspace model
 * (`readerGroups`/`writerGroups` dynamic Cognito group rules — see
 * `apps/backend/amplify/data/resource.ts` and
 * `layers/amplify/server/utils/workspaceGroups.ts`). Server routes acting on
 * behalf of a signed-in user must use `getServerUserPoolDataClient()` inside
 * `withAmplifyAuth` so the caller's `cognito:groups` claim governs AppSync
 * access. Privileged sessionless writes happen only inside dedicated Lambda
 * functions with `allow.resource(...)` grants (`stripe-webhook`,
 * `workspace-membership`, `post-confirmation`).
 */

/**
 * Resolve real AWS credentials for the current Amplify SSR context — the
 * SIGNED-IN user's Cognito Identity Pool "authenticated" role. Only valid
 * inside `withAmplifyAuth` (a user session is required; `withAmplifyPublic`
 * carries no credentials provider).
 *
 * Use this to construct plain AWS SDK v3 clients (e.g. `@aws-sdk/client-lambda`)
 * for operations that Amplify Data doesn't cover — such as the workspace
 * routes invoking the dedicated `workspace-membership` Lambda function.
 *
 * @throws if no credentials are available for the current context
 */
export const getAwsCredentials = async (contextSpec: any) => {
  const { fetchAuthSession } = await import('aws-amplify/auth/server')
  const session = await fetchAuthSession(contextSpec)

  if (!session.credentials) {
    throw new Error('No AWS credentials available for the current Amplify server context')
  }

  return session.credentials
}

/**
 * AWS region backing this Amplify project's Cognito Identity Pool, derived
 * from the identity pool id (`<region>:<uuid>`). Useful when constructing
 * plain AWS SDK v3 clients from Nitro server code.
 */
export const amplifyRegion =
  amplifyConfig.Auth?.Cognito?.identityPoolId?.split(':')[0] || process.env.AWS_REGION
