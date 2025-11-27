import { withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/schema'
import { generateClient } from 'aws-amplify/data/server'
import Stripe from 'stripe'

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

  try {
    const body = await readRawBody(event)
    const signature = getHeader(event, 'stripe-signature')

    if (!signature) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing Stripe signature'
      })
    }

    // Verify webhook signature
    const webhookEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret
    )


    // Handle different webhook events
    switch (webhookEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(webhookEvent.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(webhookEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(webhookEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(webhookEvent.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(webhookEvent.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(webhookEvent.data.object as Stripe.Invoice)
        break

      default:
    }

    return { received: true }

  } catch (error: any) {
    console.error('Webhook error:', error)

    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Webhook handling failed'
    })
  }
})

// Helper functions for database operations
async function getWorkspaceIdFromStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  try {
    // Note: This uses public access since webhooks don't have user context
    return await withAmplifyPublic(async (contextSpec) => {
      const client = generateClient<Schema>({ authMode: 'apiKey' })
      const { data, errors } = await client.models.WorkspaceSubscription.list(contextSpec, {
        filter: { stripeCustomerId: { eq: stripeCustomerId } }
      })

      if (errors) {
        console.error('Error finding workspace from Stripe customer:', errors)
        return null
      }

      const subscription = data[0]
      return subscription?.workspaceId || null
    })
  } catch (error) {
    console.error('Error in getWorkspaceIdFromStripeCustomer:', error)
    return null
  }
}

// Helper function to find plan ID by Stripe Price ID
async function getPlanIdByStripePriceId(stripePriceId: string): Promise<string | null> {
  try {
    return await withAmplifyPublic(async (contextSpec) => {
      const client = generateClient<Schema>({ authMode: 'apiKey' })
      const { data, errors } = await client.models.SubscriptionPlan.list(contextSpec, {
        filter: {
          or: [
            { stripeMonthlyPriceId: { eq: stripePriceId } },
            { stripeYearlyPriceId: { eq: stripePriceId } }
          ]
        }
      })

      if (errors || !data || data.length === 0) {
        console.error('Plan not found for Stripe price ID:', stripePriceId, errors)
        return null
      }

      return data[0].planId
    })
  } catch (error) {
    console.error('Error finding plan by Stripe price ID:', error)
    return null
  }
}

// Helper function to create or update workspace subscription
async function upsertWorkspaceSubscription(subscription: Stripe.Subscription): Promise<boolean> {
  try {
    const workspaceId = await resolveCustomerToWorkspace(subscription.customer, `subscription ${subscription.id}`)
    if (!workspaceId) return false

    const priceId = subscription.items.data[0]?.price?.id
    if (!priceId) {
      console.error('No price ID in subscription:', subscription.id)
      return false
    }

    const planId = await getPlanIdByStripePriceId(priceId)
    if (!planId) {
      console.error('Plan not found for price ID:', priceId)
      return false
    }

    return await withAmplifyPublic(async (contextSpec) => {
      const client = generateClient<Schema>({ authMode: 'apiKey' })

      // Determine billing interval
      const interval = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'year' : 'month'

      const subscriptionData = {
        planId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: getCustomerId(subscription.customer) || '',
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        billingInterval: interval as 'month' | 'year',
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      }

      // Try to update existing subscription first (identified by workspaceId)
      const { data: existing } = await client.models.WorkspaceSubscription.get(contextSpec, {
        workspaceId
      })

      if (existing) {
        // Update existing subscription
        const { errors } = await client.models.WorkspaceSubscription.update(contextSpec, {
          workspaceId,
          ...subscriptionData
        })

        if (errors) {
          console.error('Error updating workspace subscription:', errors)
          return false
        }
      } else {
        // Create new subscription
        const { errors } = await client.models.WorkspaceSubscription.create(contextSpec, {
          workspaceId,
          ...subscriptionData
        })

        if (errors) {
          console.error('Error creating workspace subscription:', errors)
          return false
        }
      }

      return true
    })
  } catch (error) {
    console.error('Error in upsertWorkspaceSubscription:', error)
    return false
  }
}

// Webhook handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId
  if (!workspaceId) {
    console.error('No workspaceId in checkout session metadata')
    return
  }

  // Workspace subscription will be created/updated by subscription.created event
  console.log(`Checkout completed for workspace: ${workspaceId}`)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  await upsertWorkspaceSubscription(subscription)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await upsertWorkspaceSubscription(subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const workspaceId = await resolveCustomerToWorkspace(subscription.customer, `subscription ${subscription.id}`)
  if (!workspaceId) return

  try {
    await withAmplifyPublic(async (contextSpec) => {
      const client = generateClient<Schema>({ authMode: 'apiKey' })

      // Revert to free plan when subscription is canceled
      const { errors } = await client.models.WorkspaceSubscription.update(contextSpec, {
        workspaceId,
        planId: 'free',
        stripeSubscriptionId: null, // No Stripe subscription for free plan
        status: 'active', // Free plan is active
        currentPeriodStart: new Date().toISOString(), // When they reverted to free
        currentPeriodEnd: null, // Free plan never expires
        cancelAtPeriodEnd: false,
        billingInterval: null, // No billing for free plan
        trialStart: null, // No trial for free plan
        trialEnd: null, // No trial for free plan
      })

      if (errors) {
        console.error('Error reverting to free plan:', errors)
      } else {
        console.log(`Workspace ${workspaceId} reverted to free plan`)
      }
    })
  } catch (error) {
    console.error('Error handling subscription deletion:', error)
  }
}

// Common helper for resolving customer to workspace
async function resolveCustomerToWorkspace(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null, context: string): Promise<string | null> {
  const customerId = getCustomerId(customer)

  if (!customerId) {
    console.error(`Invalid customer data in ${context}`)
    return null
  }

  const workspaceId = await getWorkspaceIdFromStripeCustomer(customerId)
  if (!workspaceId) {
    console.error(`No workspace found for Stripe customer: ${customerId} in ${context}`)
    return null
  }

  return workspaceId
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const workspaceId = await resolveCustomerToWorkspace(invoice.customer, `invoice ${invoice.id}`)
  if (workspaceId) {
    // TODO: Send confirmation email to workspace owner, update payment status
    console.log(`Payment succeeded for workspace: ${workspaceId}`)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const workspaceId = await resolveCustomerToWorkspace(invoice.customer, `invoice ${invoice.id}`)
  if (workspaceId) {
    // TODO: Send notification to workspace owner, handle failed payment
    console.log(`Payment failed for workspace: ${workspaceId}`)
  }
}


// Helper function to safely extract customer ID from Stripe objects
function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}
