// plugins/amplify.server.ts
import type { CookieRef } from 'nuxt/app'

import {
  createKeyValueStorageFromCookieStorageAdapter,
  createUserPoolsTokenProvider,
  createAWSCredentialsAndIdentityIdProvider,
  runWithAmplifyServerContext
} from 'aws-amplify/adapter-core'

import { parseAmplifyConfig } from 'aws-amplify/utils'

import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser
} from 'aws-amplify/auth/server'

import { generateClient } from 'aws-amplify/data/server'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/schema'

import type { LibraryOptions, FetchAuthSessionOptions } from '@aws-amplify/core'
import type {
  GraphQLOptionsV6,
  GraphQLResponseV6
} from '@aws-amplify/api-graphql'

import outputs from '../amplify_outputs.json'

/**
 * Amplify Server-Side Plugin
 *
 * Provides AWS Amplify APIs that work safely in server-side contexts (SSR, API routes, middleware).
 *
 * PLUGIN RESPONSIBILITIES:
 * ========================
 * - Parse Amplify config from amplify_outputs.json (ResourceConfig)
 * - Build cookie-backed key-value storage so SSR can read/write Cognito tokens
 * - Create token/credentials providers wired to those cookies
 * - Expose server-safe Amplify APIs (Auth, Data, GraphQL) via Nuxt provide
 * - Ensure ALL calls run inside runWithAmplifyServerContext so user tokens are applied
 *
 * AUTHORIZATION STRATEGY:
 * =======================
 * amplify_outputs.json default: API_KEY (public access)
 * This plugin's GraphQL client: 'userPool' (authenticated access)
 *
 * WHY? The plugin-provided client is designed for authenticated user operations
 * where you need to know WHO the user is (e.g., fetching user profile, user-owned data).
 *
 * For public/webhook operations that don't need user context:
 * → Use server/utils/amplify.ts helpers: withAmplifyPublic() + getServerPublicDataClient()
 *
 * USAGE EXAMPLES:
 * ===============
 *
 * Authenticated operation (uses this plugin's userPool client):
 * ```typescript
 * // In a server route: server/api/profile.get.ts
 * export default defineEventHandler(async (event) => {
 *   const { $Amplify } = useNuxtApp()
 *   const userProfile = await $Amplify.GraphQL.client.graphql({
 *     query: queries.getUserProfile,
 *     variables: { userId: event.context.userId }
 *   })
 *   return { profile: userProfile.data }
 * })
 * ```
 *
 * Public/webhook operation (use utils with apiKey auth):
 * ```typescript
 * // In a webhook: server/api/webhooks/stripe.post.ts
 * import { withAmplifyPublic, getServerPublicDataClient } from '#amplify/server/utils/amplify'
 *
 * export default defineEventHandler(async (event) => {
 *   const stripeEvent = await readBody(event)
 *
 *   return await withAmplifyPublic(async (contextSpec) => {
 *     const client = getServerPublicDataClient()
 *     await client.models.UserSubscription.update(contextSpec, {
 *       userId: stripeEvent.customerId,
 *       status: stripeEvent.status
 *     })
 *     return { success: true }
 *   })
 * })
 * ```
 *
 * WHY THIS DIFFERS FROM OFFICIAL DOCS:
 * =====================================
 * Official Amplify docs show creating clients without authMode, then specifying
 * it per-operation. Our approach creates clients with fixed authMode for:
 *
 * - Fail-safety: Plugin client always uses userPool, can't accidentally use API key
 * - Clarity: Separate helpers for different auth modes (userPool vs apiKey)
 * - Team safety: Explicit separation prevents auth mode confusion
 *
 * Both approaches are valid; ours prioritizes safety and clarity over flexibility.
 */

// 1) Parse SSR config (ResourceConfig)
const amplifyConfig = parseAmplifyConfig(outputs)

// 2) Build cookie names required by Cognito (LastAuthUser + tokens)
const userPoolClientId = amplifyConfig.Auth!.Cognito.userPoolClientId
const lastAuthUserCookieName =
  'CognitoIdentityServiceProvider.' + userPoolClientId + '.LastAuthUser'

// Helper to compute all token cookie names for a specific username
const getAmplifyAuthKeys = (lastAuthUser: string) =>
  ['idToken', 'accessToken', 'refreshToken', 'clockDrift']
    .map(key => 'CognitoIdentityServiceProvider.' + userPoolClientId + '.' + lastAuthUser + '.' + key)
    .concat(lastAuthUserCookieName)

/**
 * Create server-side GraphQL client with User Pool authentication
 *
 * This client is designed for authenticated user operations where we need
 * to know WHO the user is and apply owner-based authorization rules.
 *
 * authMode: 'userPool' ensures:
 * - Cognito JWT tokens are included in requests
 * - User identity (userId, email, claims) is available in resolvers
 * - Owner-based @auth rules work correctly
 * - Private data access (@auth private) is enabled
 *
 * For public operations (webhooks, public data), use getServerPublicDataClient()
 * from server/utils/amplify.ts which uses authMode: 'apiKey'
 */
const gqlServerClient = generateClient<Schema>({
  config: amplifyConfig,
  authMode: 'userPool' // Override API_KEY default for authenticated operations
})

export default defineNuxtPlugin({
  name: 'amplify.server',
  enforce: 'pre',
  setup() {
    // Cookie lifetime (e.g., 30 days ~ default Cognito refresh token lifetime)
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)

    // TIP: set path:'/' so cookies are sent for all routes in your app
    const cookieOpts = { sameSite: 'lax', expires, secure: true, path: '/' as const }

    // This cookie stores the username of the last authenticated user
    const lastAuthUserCookie = useCookie<string | null>(lastAuthUserCookieName, cookieOpts)

    // Build the list of actual token cookie names (id/access/refresh/clockDrift)
    const authKeys = lastAuthUserCookie.value ? getAmplifyAuthKeys(lastAuthUserCookie.value) : []

    // Map cookieName -> CookieRef
    // (Using useCookie() here prevents cross-request pollution in SSR.)
    const amplifyCookies = authKeys
      .map(name => ({ name, cookieRef: useCookie<string | null | undefined>(name, cookieOpts) }))
      .reduce<Record<string, CookieRef<string | null | undefined>>>(
        (acc, cur) => ({ ...acc, [cur.name]: cur.cookieRef }),
        {}
      )

    // KeyValueStorage adapter bound to Nuxt cookies
    // - Provides tokens to Amplify server APIs
    // - If you implement set()/delete(), refreshed tokens will be sent back
    //   to the browser via Set-Cookie headers automatically.
    const keyValueStorage = createKeyValueStorageFromCookieStorageAdapter({
      get(name) {
        const ref = amplifyCookies[name]
        if (ref?.value) return { name, value: ref.value }
        return undefined
      },
      getAll() {
        return Object.entries(amplifyCookies).map(([name, ref]) => ({
          name,
          value: ref.value ?? undefined
        }))
      },
      set(name, value) {
        const ref = amplifyCookies[name]
        if (ref) ref.value = value
      },
      delete(name) {
        const ref = amplifyCookies[name]
        if (ref) ref.value = null
      }
    })

    // Providers that read/write tokens/credentials via the cookie storage
    const tokenProvider = createUserPoolsTokenProvider(amplifyConfig.Auth!, keyValueStorage)
    const credentialsProvider = createAWSCredentialsAndIdentityIdProvider(
      amplifyConfig.Auth!,
      keyValueStorage
    )

    // Library options to pass into server context
    const libraryOptions: LibraryOptions = {
      Auth: { tokenProvider, credentialsProvider }
    }

    return {
      provide: {
        Amplify: {
          /**
           * AUTH (server)
           * Always call inside runWithAmplifyServerContext so the correct
           * user tokens from cookies are applied during SSR.
           *
           * Example usage in a server route:
           *   const { $Amplify } = useNuxtApp()
           *   const session = await $Amplify.Auth.fetchAuthSession()
           */
          Auth: {
            fetchAuthSession: (options?: FetchAuthSessionOptions) =>
              runWithAmplifyServerContext(
                amplifyConfig,
                libraryOptions,
                ctx => fetchAuthSession(ctx, options)
              ),
            fetchUserAttributes: () =>
              runWithAmplifyServerContext(
                amplifyConfig,
                libraryOptions,
                ctx => fetchUserAttributes(ctx)
              ),
            getCurrentUser: () =>
              runWithAmplifyServerContext(
                amplifyConfig,
                libraryOptions,
                ctx => getCurrentUser(ctx)
              )
          },

          /**
           * GRAPHQL (server)
           * A thin wrapper that executes graphql() inside the server context.
           * Provides access to both custom queries/mutations and typed models.
           *
           * Example (custom query):
           *   const res = await $Amplify.GraphQL.client.graphql({
           *     query: `query GetX($id: ID!) { getX(id:$id) { id name } }`,
           *     variables: { id: '123' }
           *   })
           *
           * Example (typed models):
           *   const users = await $Amplify.GraphQL.client.models.User.list()
           */
          GraphQL: {
            client: {
              graphql: <
                FALLBACK_TYPES = unknown,
                TYPED_GQL_STRING extends string = string
              >(
                options: GraphQLOptionsV6<FALLBACK_TYPES, TYPED_GQL_STRING>,
                additionalHeaders?: Record<string, string>
              ) =>
                runWithAmplifyServerContext<
                  GraphQLResponseV6<FALLBACK_TYPES, TYPED_GQL_STRING>
                >(amplifyConfig, libraryOptions, ctx =>
                  gqlServerClient.graphql(ctx, options, additionalHeaders)
                )
            }
          }
        }
      }
    }
  }
})
