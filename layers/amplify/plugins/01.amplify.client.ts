import { Amplify } from 'aws-amplify'
import * as Auth from 'aws-amplify/auth'
import { uploadData, getUrl } from 'aws-amplify/storage'
import { generateClient } from 'aws-amplify/data'
import outputs from '../amplify_outputs.json'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/schema'

/**
 * Amplify Client-Side Plugin
 *
 * Configures AWS Amplify for browser-side operations with SSR support.
 *
 * AUTHORIZATION STRATEGY:
 * ========================
 * Our amplify_outputs.json specifies default_authorization_type: "API_KEY"
 * However, we explicitly override this with authMode: 'userPool' because:
 *
 * 1. Client-side operations are typically performed by authenticated users
 * 2. User Pool auth provides user identity context (userId, email, claims)
 * 3. Enables owner-based authorization rules (@auth rules with owner field)
 * 4. Most client operations require knowing WHO the user is
 *
 * WHEN TO USE DIFFERENT AUTH MODES:
 * ==================================
 *
 * The default client uses 'userPool' auth, which is correct for most cases.
 * If you need a different auth mode for specific operations, you have options:
 *
 * Option 1: Create a separate client instance (recommended for multiple operations)
 * ```typescript
 * const { $Amplify } = useNuxtApp()
 * const publicClient = generateClient<Schema>({
 *   config: outputs,
 *   authMode: 'apiKey'
 * })
 * const { data } = await publicClient.models.SubscriptionPlan.list()
 * ```
 *
 * Option 2: Use server-side API routes for public operations
 * ```typescript
 * // Preferred: Let server handle public operations with proper auth mode
 * const { data } = await $fetch('/api/public/plans')
 * ```
 *
 * WHY THIS DIFFERS FROM OFFICIAL DOCS:
 * =====================================
 * Official Amplify docs show creating clients without authMode, then specifying
 * it per-operation. Our approach creates a client with a fixed authMode for:
 *
 * - Fail-safety: Can't accidentally use wrong auth mode
 * - Simplicity: Less verbose, clearer intent
 * - Team clarity: Explicit about authentication expectations
 *
 * Both approaches are valid; ours prioritizes safety over flexibility.
 */
export default defineNuxtPlugin({
  name: 'amplify.client',
  enforce: 'pre',
  setup() {
    Amplify.configure(outputs, { ssr: true })

    /**
     * Default GraphQL client configured for User Pool authentication
     *
     * This client will use Cognito User Pool tokens from authenticated users.
     * All requests will include the user's JWT token, enabling:
     * - Owner-based authorization (@auth owner rules)
     * - Private data access (@auth private rules)
     * - User identity context in resolvers
     */
    const client = generateClient<Schema>({
      config: outputs,
      authMode: 'userPool' // Override API_KEY default for authenticated operations
    })

    return {
      provide: {
        Amplify: {
          Auth,
          GraphQL: { client },
          Storage: { uploadData, getUrl }
        }
      }
    }
  }
})
