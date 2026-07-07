import { requireAuth } from '../utils/auth'
import { withAmplifyAuth, getServerUserPoolDataClient } from '@mmshark/amplify-layer/server/utils/amplify'

/**
 * GET /api/profile
 *
 * Fetch the authenticated caller's own `UserProfile` row. `UserProfile` is
 * owner-`read`-only in the data schema (see
 * `apps/backend/amplify/data/resource.ts`), so a plain userPool-authorized
 * read is sufficient here — no privileged/IAM path is needed for reads.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  return await withAmplifyAuth(event, async (contextSpec) => {
    const client = getServerUserPoolDataClient()

    const { data, errors } = await client.models.UserProfile.get(contextSpec, {
      userId: user.userId
    })

    if (errors) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch profile' })
    }

    return { profile: data }
  })
})
