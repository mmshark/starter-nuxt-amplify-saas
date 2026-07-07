import { requireAuth } from '../utils/auth'

/**
 * PUT /api/profile
 *
 * Intended write path for `UserProfile` (the composable-side counterpart to
 * `updateUserProfile()` in `useUser.ts`). It is wired here — authenticated,
 * correctly keyed on `userId` (not the old `id` bug) — but currently fails
 * closed rather than silently succeeding, because:
 *
 *   1. `UserProfile` grants the owner `read` only (see
 *      `apps/backend/amplify/data/resource.ts`); the only writer is the
 *      `post-confirmation` trigger's `allow.resource(postConfirmation)`
 *      grant. There is no privileged (Lambda `allow.resource(...)`) write
 *      path for user-triggered profile edits, mirroring how every other
 *      tenant write in this codebase is done post-security-fix
 *      (`workspace-membership`, `stripe-webhook`) — none exists yet for
 *      "user edits their own profile".
 *   2. The model itself has no user-editable field to write: its only
 *      columns are `userId` and system-managed `stripeCustomerId`. Name/
 *      email changes are Cognito attributes and go through
 *      `updateAttributes()`, not this table.
 *
 * When a real user-editable field + privileged write grant are added, this
 * route is where the write belongs (verify `userId` ownership from
 * `requireAuth`, never trust a client-supplied id, then invoke whatever
 * privileged path is wired — e.g. a dedicated Lambda function resource, the
 * same shape as `workspace-membership`).
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  throw createError({
    statusCode: 501,
    statusMessage: 'Not Implemented',
    message: 'Profile field updates are not supported yet: UserProfile is owner-read-only and has no user-editable fields. Use updateAttributes() for Cognito profile fields (name, email).'
  })
})
