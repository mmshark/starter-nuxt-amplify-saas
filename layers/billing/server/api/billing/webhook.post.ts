import Stripe from 'stripe'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { withAmplifyPublic, getAwsCredentials, amplifyRegion, amplifyOutputs } from '@mmshark/amplify-layer/server/utils/amplify'

/**
 * Stripe webhook entry point.
 *
 * This route ONLY verifies the Stripe signature and parses the event — it
 * never writes `WorkspaceSubscription` itself. The actual DB sync happens in
 * the dedicated `stripe-webhook` Amplify function
 * (`apps/backend/amplify/functions/stripe-webhook/`), which holds its own
 * `allow.resource(stripeWebhook)` grant on the model. This route has no
 * Cognito session to draw IAM credentials strong enough for that write from
 * (Phase 2 gap) — see `layers/amplify/server/utils/amplify.ts` for how the
 * guest (unauthenticated Identity Pool) credentials used to invoke the
 * function are obtained, and `apps/backend/amplify/backend.ts` for the
 * `grantInvoke` that authorizes exactly that invocation.
 */

// Event types the stripe-webhook function actually understands. Everything
// else is acknowledged without invoking the function.
const RELEVANT_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey || !config.stripe?.webhookSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration missing'
    })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2025-02-24.acacia'
  })

  const body = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!signature || !body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing Stripe signature or body'
    })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, signature, config.stripe.webhookSecret)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err)
    throw createError({
      statusCode: 400,
      statusMessage: `Webhook signature verification failed: ${err.message}`
    })
  }

  if (!RELEVANT_EVENT_TYPES.has(stripeEvent.type)) {
    return { received: true }
  }

  try {
    await withAmplifyPublic(async (contextSpec) => {
      await invokeStripeWebhookFunction(contextSpec, {
        id: stripeEvent.id,
        type: stripeEvent.type,
        created: stripeEvent.created,
        data: stripeEvent.data
      })
    })
  } catch (error: any) {
    console.error(`Failed to sync Stripe event ${stripeEvent.id} (${stripeEvent.type}):`, error)
    // Fail loudly so Stripe retries delivery (Task 3.3 step 2) instead of
    // silently swallowing a failed DB write.
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to sync subscription data'
    })
  }

  return { received: true }
})

async function invokeStripeWebhookFunction(contextSpec: any, payload: Record<string, unknown>): Promise<void> {
  const functionName = amplifyOutputs.custom?.stripeWebhookFunctionName
  if (!functionName) {
    throw new Error(
      'amplify_outputs.json has no custom.stripeWebhookFunctionName. Redeploy the backend ' +
        '(the stripe-webhook function output is added in apps/backend/amplify/backend.ts).'
    )
  }

  const credentials = await getAwsCredentials(contextSpec)
  const lambda = new LambdaClient({ region: amplifyRegion, credentials })

  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload))
    })
  )

  if (response.FunctionError) {
    const errorPayload = response.Payload ? Buffer.from(response.Payload).toString('utf-8') : ''
    throw new Error(`stripe-webhook function returned ${response.FunctionError}: ${errorPayload}`)
  }
}
