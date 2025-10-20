import type { H3Event, EventHandlerRequest } from 'h3'
import { parseCookies } from 'h3'
import type { CookieRef } from 'nuxt/app'
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
export const withAmplifyPublic = async <T>(
  callback: (contextSpec: any) => T | Promise<T>
): Promise<T> => {
  return runWithAmplifyServerContext<T>(
    amplifyConfig,
    {}, // No auth options for public access
    callback
  )
}

/**
 * Create a preconfigured Data client for server-side public (apiKey) operations.
 * Use together with withAmplifyPublic to provide contextSpec for calls.
 */
export const getServerPublicDataClient = () => {
  return generateClient<Schema>({ config: amplifyConfig, authMode: 'apiKey' })
}

/**
 * Create a preconfigured Data client for server-side userPool operations.
 * Use together with withAmplifyAuth to provide contextSpec for calls.
 */
export const getServerUserPoolDataClient = () => {
  return generateClient<Schema>({ config: amplifyConfig, authMode: 'userPool' })
}
