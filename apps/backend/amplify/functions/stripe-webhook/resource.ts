import { defineFunction } from '@aws-amplify/backend'

/**
 * stripe-webhook
 *
 * Performs the privileged `WorkspaceSubscription` writes driven by Stripe
 * webhook events. The Stripe webhook has no Cognito session, so Nitro's
 * `layers/billing/server/api/billing/webhook.post.ts` route cannot obtain
 * `allow.authenticated('identityPool')` credentials strong enough to write
 * tenant data on its own. Instead:
 *
 *  1. Nitro verifies the Stripe signature and parses the event (it never
 *     writes to `WorkspaceSubscription` directly).
 *  2. Nitro invokes THIS function (via the AWS SDK, using the Cognito
 *     Identity Pool "unauthenticated" role's credentials — see
 *     `withAmplifyPublic`/`getAwsCredentials` in
 *     `layers/amplify/server/utils/amplify.ts` — which is granted
 *     `lambda:InvokeFunction` on this function in `backend.ts`).
 *  3. This function performs the actual DB writes using its own
 *     `allow.resource(stripeWebhook)` grant on `WorkspaceSubscription` and
 *     `ProcessedStripeEvent` (see `apps/backend/amplify/data/resource.ts`),
 *     mirroring the `postConfirmation` function's pattern.
 *
 * No `allow.publicApiKey()` write is used anywhere in this path.
 */
export const stripeWebhook = defineFunction({
  name: 'stripe-webhook',
  timeoutSeconds: 30,
})
