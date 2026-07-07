import type { Handler } from 'aws-lambda'
import { type Schema } from '../../data/resource'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { env } from '$amplify/env/stripe-webhook'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)

Amplify.configure(resourceConfig, libraryOptions)

const client = generateClient<Schema>()

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

function getCustomerId(customer: unknown): string | null {
  if (!customer) return null
  if (typeof customer === 'string') return customer
  if (typeof customer === 'object' && customer !== null && 'id' in customer) {
    return (customer as { id: string }).id
  }
  return null
}

/**
 * Payload shape sent by Nitro's `webhook.post.ts` after it has already
 * verified the Stripe signature. This function trusts its invoker (the
 * unauthenticated Identity Pool role, scoped to `lambda:InvokeFunction` on
 * this function only — see `backend.ts`) rather than re-verifying Stripe
 * signatures itself.
 */
interface StripeWebhookInvokeEvent {
  id: string
  type: string
  created: number
  data: { object: Record<string, any> }
}

type InvokeResult = { ok: true; skipped?: 'duplicate' | 'stale' | 'unmapped-status' }

export const handler: Handler<StripeWebhookInvokeEvent, InvokeResult> = async (event) => {
  const { id: eventId, type, created, data } = event

  if (!eventId || !type || !data?.object) {
    throw new Error('Invalid stripe-webhook invocation payload')
  }

  // Idempotency: a redelivered/retried Stripe event (or a retried invoke) must
  // not be reprocessed (Task 3.3 step 3).
  const { data: existingEvent } = await client.models.ProcessedStripeEvent.get({ eventId })
  if (existingEvent) {
    console.log(`Stripe event ${eventId} (${type}) already processed, skipping`)
    return { ok: true, skipped: 'duplicate' }
  }

  switch (type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await upsertWorkspaceSubscription(data.object, created)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(data.object, created)
      break

    case 'checkout.session.completed':
      // The subscription is created/updated by the paired
      // customer.subscription.* event; nothing to persist here.
      console.log(`Checkout completed for workspace ${data.object?.metadata?.workspaceId}`)
      break

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      // No WorkspaceSubscription fields depend on invoice events today.
      console.log(`Received ${type} for customer ${getCustomerId(data.object?.customer)}`)
      break

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

  return { ok: true }
}

async function upsertWorkspaceSubscription(subscription: Record<string, any>, eventCreated: number): Promise<void> {
  const workspaceId = subscription?.metadata?.workspaceId
  if (!workspaceId) {
    // Fail loudly: Stripe will retry, and this is not recoverable without a
    // workspaceId to write to (Task 3.3 step 1/2).
    throw new Error(`Missing metadata.workspaceId on subscription ${subscription?.id}`)
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
  // this workspace (Task 3.3 step 3) — Stripe does not guarantee delivery
  // order.
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

  const subscriptionData = {
    planId,
    stripeSubscriptionId: subscription.id as string,
    stripeCustomerId: getCustomerId(subscription.customer) || '',
    status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    billingInterval: interval as 'month' | 'year',
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  }

  const { errors } = existing
    ? await client.models.WorkspaceSubscription.update({ workspaceId, ...subscriptionData })
    : await client.models.WorkspaceSubscription.create({ workspaceId, ...subscriptionData })

  if (errors) {
    // Fail loudly so Nitro's invoke sees a FunctionError and returns 500,
    // which makes Stripe retry the webhook delivery (Task 3.3 step 2).
    throw new Error(`Failed to upsert WorkspaceSubscription for workspace ${workspaceId}: ${JSON.stringify(errors)}`)
  }
}

async function handleSubscriptionDeleted(subscription: Record<string, any>, eventCreated: number): Promise<void> {
  const workspaceId = subscription?.metadata?.workspaceId
  if (!workspaceId) {
    throw new Error(`Missing metadata.workspaceId on subscription ${subscription?.id}`)
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
