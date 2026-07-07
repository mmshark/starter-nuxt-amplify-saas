import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda'
import type { Schema } from '../../data/resource'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { env } from '$amplify/env/stripe-webhook'
import Stripe from 'stripe'
import { workspaceGroupFields } from '@mmshark/amplify-layer/server/utils/workspaceGroups'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)

Amplify.configure(resourceConfig, libraryOptions)

const client = generateClient<Schema>()

// The Stripe SDK instance is only used for `webhooks.constructEvent`
// (signature verification); no Stripe API calls are made from here.
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
})

/**
 * Event types this endpoint actually understands. Everything else is
 * acknowledged (200) without processing.
 */
const RELEVANT_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

/**
 * Whitelist mapping Stripe subscription statuses onto the schema's
 * `WorkspaceSubscription.status` enum. Statuses outside this list (e.g. a
 * future Stripe status this schema doesn't model yet) are parked — logged
 * and skipped — rather than force-cast with `as any` (review M5).
 */
const SUBSCRIPTION_STATUS_WHITELIST = [
  'active',
  'past_due',
  'canceled',
  'trialing',
  'incomplete',
  'incomplete_expired',
  'unpaid',
] as const
type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS_WHITELIST)[number]

function mapSubscriptionStatus(status: string): SubscriptionStatus | null {
  return (SUBSCRIPTION_STATUS_WHITELIST as readonly string[]).includes(status)
    ? (status as SubscriptionStatus)
    : null
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

function respond(statusCode: number, body: Record<string, unknown>): LambdaFunctionURLResult {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/**
 * Direct Stripe webhook endpoint (Lambda Function URL — see `resource.ts`
 * and `backend.ts`). The STRIPE SIGNATURE is the authorization: the raw body
 * is verified against the `stripe-signature` header with the endpoint's
 * signing secret BEFORE anything is parsed or persisted. 5xx responses make
 * Stripe retry delivery.
 */
export const handler = async (event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
  // Function URL headers are lower-cased.
  const signature = event.headers?.['stripe-signature']
  const rawBody =
    event.body && event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body

  if (!signature || !rawBody) {
    return respond(400, { error: 'Missing Stripe signature or body' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    return respond(400, { error: 'Webhook signature verification failed' })
  }

  if (!RELEVANT_EVENT_TYPES.has(stripeEvent.type)) {
    return respond(200, { received: true })
  }

  try {
    const skipped = await processStripeEvent(stripeEvent)
    return respond(200, skipped ? { received: true, skipped } : { received: true })
  } catch (error) {
    console.error(`Failed to sync Stripe event ${stripeEvent.id} (${stripeEvent.type}):`, error)
    // Fail loudly (5xx) so Stripe retries delivery instead of a failed DB
    // write being silently swallowed.
    return respond(500, { error: 'Failed to sync subscription data' })
  }
}

type SkipReason = 'duplicate' | 'stale' | 'unmapped-status' | null

async function processStripeEvent(stripeEvent: Stripe.Event): Promise<SkipReason> {
  const { id: eventId, type, created } = stripeEvent

  // Idempotency: a redelivered/retried Stripe event must not be reprocessed.
  const { data: existingEvent } = await client.models.ProcessedStripeEvent.get({ eventId })
  if (existingEvent) {
    console.log(`Stripe event ${eventId} (${type}) already processed, skipping`)
    return 'duplicate'
  }

  switch (type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await upsertWorkspaceSubscription(stripeEvent.data.object as Stripe.Subscription, created)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription, created)
      break

    case 'checkout.session.completed': {
      // The subscription is created/updated by the paired
      // customer.subscription.* event; nothing to persist here.
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      console.log(`Checkout completed for workspace ${session.metadata?.workspaceId}`)
      break
    }

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      // No WorkspaceSubscription fields depend on invoice events today.
      const invoice = stripeEvent.data.object as Stripe.Invoice
      console.log(`Received ${type} for customer ${getCustomerId(invoice.customer)}`)
      break
    }

    default:
      console.log(`Unhandled Stripe event type: ${type}`)
  }

  const { errors: markErrors } = await client.models.ProcessedStripeEvent.create({
    eventId,
    type,
    processedAt: new Date().toISOString(),
  })

  if (markErrors) {
    // Non-fatal: the sync above already succeeded (or threw). Worst case a
    // retry reprocesses this event, which upsertWorkspaceSubscription's
    // ordering guard makes safe.
    console.error(`Failed to record processed Stripe event ${eventId}:`, markErrors)
  }

  return null
}

async function upsertWorkspaceSubscription(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
  const workspaceId = subscription.metadata?.workspaceId
  if (!workspaceId) {
    // Fail loudly: Stripe will retry, and this is not recoverable without a
    // workspaceId to write to.
    throw new Error(`Missing metadata.workspaceId on subscription ${subscription.id}`)
  }

  const priceId = subscription.items?.data?.[0]?.price?.id
  if (!priceId) {
    throw new Error(`No price ID in subscription ${subscription.id}`)
  }

  const { data: plans, errors: planErrors } = await client.models.SubscriptionPlan.list({
    filter: {
      or: [{ stripeMonthlyPriceId: { eq: priceId } }, { stripeYearlyPriceId: { eq: priceId } }],
    },
  })

  if (planErrors || !plans?.length) {
    throw new Error(`Plan not found for Stripe price ${priceId} (workspace ${workspaceId})`)
  }
  const planId = plans[0].planId

  const status = mapSubscriptionStatus(subscription.status)
  if (!status) {
    console.warn(
      `Unmapped Stripe subscription status "${subscription.status}" for subscription ${subscription.id} ` +
        `(workspace ${workspaceId}); parking event without a status update`
    )
    return
  }

  const { data: existing } = await client.models.WorkspaceSubscription.get({ workspaceId })

  // Ordering guard: ignore an event older than the last write we made for
  // this workspace — Stripe does not guarantee delivery order.
  if (existing?.updatedAt) {
    const existingUpdatedAtMs = new Date(existing.updatedAt).getTime()
    if (eventCreated * 1000 < existingUpdatedAtMs) {
      console.log(
        `Ignoring stale event for workspace ${workspaceId} (event created ${eventCreated}, ` +
          `record last updated ${existing.updatedAt})`
      )
      return
    }
  }

  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'year' : 'month'

  // Stripe API 2025-08-27.basil (stripe-node v18) moved current_period_start/end
  // from the Subscription object down to each SubscriptionItem.
  const firstItem = subscription.items?.data?.[0]
  const currentPeriodStart = firstItem?.current_period_start ?? Math.floor(Date.now() / 1000)
  const currentPeriodEnd = firstItem?.current_period_end ?? currentPeriodStart

  const subscriptionData = {
    planId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: getCustomerId(subscription.customer) || '',
    status,
    currentPeriodStart: new Date(currentPeriodStart * 1000).toISOString(),
    currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    billingInterval: interval as 'month' | 'year',
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  }

  const { errors } = existing
    ? await client.models.WorkspaceSubscription.update({ workspaceId, ...subscriptionData })
    : await client.models.WorkspaceSubscription.create({
        workspaceId,
        ...subscriptionData,
        // Group-per-workspace authorization fields (create path only — see
        // apps/backend/amplify/data/resource.ts).
        ...workspaceGroupFields(workspaceId),
      })

  if (errors) {
    // Fail loudly so the handler returns 500 and Stripe retries delivery.
    throw new Error(`Failed to upsert WorkspaceSubscription for workspace ${workspaceId}: ${JSON.stringify(errors)}`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
  const workspaceId = subscription.metadata?.workspaceId
  if (!workspaceId) {
    throw new Error(`Missing metadata.workspaceId on subscription ${subscription.id}`)
  }

  const { data: existing } = await client.models.WorkspaceSubscription.get({ workspaceId })

  if (existing?.updatedAt) {
    const existingUpdatedAtMs = new Date(existing.updatedAt).getTime()
    if (eventCreated * 1000 < existingUpdatedAtMs) {
      console.log(`Ignoring stale delete event for workspace ${workspaceId}`)
      return
    }
  }

  const { errors } = await client.models.WorkspaceSubscription.update({
    workspaceId,
    planId: 'free',
    stripeSubscriptionId: null,
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    billingInterval: null,
    trialStart: null,
    trialEnd: null,
  })

  if (errors) {
    throw new Error(`Failed to revert workspace ${workspaceId} to the free plan: ${JSON.stringify(errors)}`)
  }

  console.log(`Workspace ${workspaceId} reverted to the free plan`)
}
