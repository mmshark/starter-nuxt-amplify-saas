import Stripe from 'stripe'
import { generateClient } from 'aws-amplify/data/server'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/schema'
import { withAmplifyPublic } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

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
async function getUserIdFromStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  try {
    // Note: This uses public access since webhooks don't have user context
    return await withAmplifyPublic(async (contextSpec) => {
      const client = generateClient<Schema>({ authMode: 'apiKey' })
      const { data, errors } = await client.models.UserProfile.list(contextSpec, {
        filter: { stripeCustomerId: { eq: stripeCustomerId } }
      })

      if (errors) {
        console.error('Error finding user from Stripe customer:', errors)
        return null
      }

      const profile = data[0]
      return profile?.userId || null
    })
  } catch (error) {
    console.error('Error in getUserIdFromStripeCustomer:', error)
    return null
  }
}

async function updateUserProfile(userId: string, updates: { stripeCustomerId?: string; stripePriceId?: string; stripeProductId?: string }): Promise<boolean> {
  try {
    // Note: This uses public access since webhooks don't have user context
    return await withAmplifyPublic(async (contextSpec) => {
      const client = generateClient<Schema>({ authMode: 'apiKey' })
      const { data, errors } = await client.models.UserProfile.update(contextSpec, {
        userId: userId,
        ...updates
      })

      if (errors) {
        console.error('Error updating user profile:', errors)
        return false
      }

      return true
    })
  } catch (error) {
    console.error('Error in updateUserProfile:', error)
    return false
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

// Helper function to create or update user subscription
async function upsertUserSubscription(subscription: Stripe.Subscription): Promise<boolean> {
  try {
    const userId = await resolveCustomerToUser(subscription.customer, `subscription ${subscription.id}`)
    if (!userId) return false

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
        userId,
        planId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: getCustomerId(subscription.customer) || '',
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        billingInterval: interval,
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      }

      // Try to update existing subscription first (now identified only by userId)
      const { data: existing } = await client.models.UserSubscription.list(contextSpec, {
        filter: {
          userId: { eq: userId }
        }
      })

      if (existing && existing.length > 0) {
        // Update existing - replace the current subscription
        const { errors } = await client.models.UserSubscription.update(contextSpec, {
          userId,
          ...subscriptionData
        })

        if (errors) {
          console.error('Error updating user subscription:', errors)
          return false
        }
      } else {
        // Create new subscription (this shouldn't happen if post-confirmation creates free subscription)
        const { errors } = await client.models.UserSubscription.create(contextSpec, subscriptionData)

        if (errors) {
          console.error('Error creating user subscription:', errors)
          return false
        }
      }

      // Also update UserProfile for backward compatibility
      await updateUserProfile(userId, {
        stripeCustomerId: getCustomerId(subscription.customer) || undefined,
        stripePriceId: priceId,
        stripeProductId: subscription.items.data[0]?.price?.product as string || undefined
      })

      return true
    })
  } catch (error) {
    console.error('Error in upsertUserSubscription:', error)
    return false
  }
}

// Webhook handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {

  const userId = session.metadata?.userId
  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  // Update user's profile with customer ID
  if (session.customer) {
    await updateUserProfile(userId, {
      stripeCustomerId: getCustomerId(session.customer) || undefined
    })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  await upsertUserSubscription(subscription)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await upsertUserSubscription(subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {

  const userId = await resolveCustomerToUser(subscription.customer, `subscription ${subscription.id}`)
  if (!userId) return

  try {
    await withAmplifyPublic(async (contextSpec) => {
      const client = generateClient<Schema>({ authMode: 'apiKey' })

      // Revert to free plan when subscription is canceled
      const { errors } = await client.models.UserSubscription.update(contextSpec, {
        userId,
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
      }
    })

    // Also clear UserProfile subscription data
    await updateUserProfile(userId, {
      stripePriceId: '',
      stripeProductId: undefined
    })

  } catch (error) {
    console.error('Error handling subscription deletion:', error)
  }
}

// Common helper for resolving customer to user
async function resolveCustomerToUser(customer: string | Stripe.Customer | null, context: string): Promise<string | null> {
  const customerId = getCustomerId(customer)

  if (!customerId) {
    console.error(`Invalid customer data in ${context}`)
    return null
  }

  const userId = await getUserIdFromStripeCustomer(customerId)
  if (!userId) {
    console.error(`No user found for Stripe customer: ${customerId} in ${context}`)
    return null
  }

  return userId
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = await resolveCustomerToUser(invoice.customer, `invoice ${invoice.id}`)
  if (userId) {
    // TODO: Send confirmation email, update payment status
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = await resolveCustomerToUser(invoice.customer, `invoice ${invoice.id}`)
  if (userId) {
    // TODO: Send notification, handle failed payment
  }
}


// Helper function to safely extract customer ID from Stripe objects
function getCustomerId(customer: string | Stripe.Customer | null): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}
