import Stripe from 'stripe'
import { generateClient } from 'aws-amplify/data/server'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/schema'
import { withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration missing'
    })
  }

  // Parse request body
  const body = await readBody(event)
  const { priceId, planId, billingInterval } = body

  if (!priceId || !planId || !billingInterval) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters: priceId, planId, billingInterval'
    })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2025-02-24.acacia'
  })

  return await withAmplifyAuth(event, async (contextSpec) => {
    // Get user data from auth session
    const session = await fetchAuthSession(contextSpec)
    const userAttributes = await fetchUserAttributes(contextSpec)

    const userId = session.tokens?.idToken?.payload?.sub
    const email = userAttributes?.email

    if (!userId || !email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User authentication data incomplete'
      })
    }
    const client = generateClient<Schema>({ authMode: 'userPool' })
    const { data: profiles } = await client.models.UserProfile.list(contextSpec, {
      filter: { userId: { eq: userId } }
      })

      let customerId: string
      const existingProfile = profiles?.[0]

      if (existingProfile?.stripeCustomerId) {
        customerId = existingProfile.stripeCustomerId
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email,
          metadata: {
            userId
          }
        })

        customerId = customer.id

        // Update user profile with customer ID
        if (existingProfile) {
          await client.models.UserProfile.update(contextSpec, {
            userId,
            stripeCustomerId: customerId
          })
        } else {
          await client.models.UserProfile.create(contextSpec, {
            userId,
            stripeCustomerId: customerId
          })
        }
      }

      // Create Stripe checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        metadata: {
          userId,
          planId,
          billingInterval
        },
        success_url: `${getBaseUrl(event)}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getBaseUrl(event)}/pricing`,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
          name: 'auto'
        }
      })

      return {
        success: true,
        data: {
          url: checkoutSession.url,
          sessionId: checkoutSession.id
        }
      }
  })
})

// Helper function to get base URL
function getBaseUrl(event: any): string {
  const headers = getHeaders(event)
  const host = headers.host || headers['x-forwarded-host'] || 'localhost:3000'
  const protocol = headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}
