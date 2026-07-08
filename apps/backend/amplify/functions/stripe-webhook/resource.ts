import { defineFunction, secret } from '@aws-amplify/backend'

/**
 * stripe-webhook
 *
 * The DIRECT Stripe webhook endpoint. `backend.ts` gives this function a
 * public Lambda Function URL (authType NONE) which is the HTTPS endpoint
 * registered in the Stripe dashboard; the URL is exported as
 * `custom.stripeWebhookUrl` in amplify_outputs.json.
 *
 * AUTHORIZATION MODEL: the Stripe SIGNATURE is the authorization, not the
 * caller identity. The handler verifies the `stripe-signature` header
 * against the raw request body with `STRIPE_WEBHOOK_SECRET`
 * (`stripe.webhooks.constructEvent`) before parsing or persisting anything.
 * Unsigned/forged requests are rejected with 400. No IAM principal — and in
 * particular no Cognito identity-pool role, authenticated or guest — is
 * granted `lambda:InvokeFunction` on this function.
 *
 * The function performs its `WorkspaceSubscription` / `ProcessedStripeEvent`
 * writes under its own `allow.resource(stripeWebhook)` grant (see
 * `apps/backend/amplify/data/resource.ts`). Idempotency (event dedupe),
 * out-of-order delivery guard, status whitelist and per-workspace
 * `metadata.workspaceId` resolution all live in the handler, behind the
 * signature check.
 */
export const stripeWebhook = defineFunction({
  name: 'stripe-webhook',
  timeoutSeconds: 30,
  environment: {
    // Used only to construct the Stripe SDK instance for signature
    // verification (no Stripe API calls are made from this function).
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    // The endpoint signing secret from the Stripe dashboard (whsec_...).
    STRIPE_WEBHOOK_SECRET: secret('STRIPE_WEBHOOK_SECRET'),
  },
})
