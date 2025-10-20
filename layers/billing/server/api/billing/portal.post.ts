import Stripe from 'stripe'
import { withAmplifyAuth, getServerUserPoolDataClient } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { fetchAuthSession } from 'aws-amplify/auth/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration missing'
    })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2025-02-24.acacia'
  })

  // Parse request body for flow parameters
  const body = await readBody(event).catch(() => ({}))
  const {
    flow_type = 'subscription_update',
    return_url,
    configuration_id
  } = body

  return await withAmplifyAuth(event, async (contextSpec) => {
    // Get user ID from auth session
    const session = await fetchAuthSession(contextSpec)
    const userId = session.tokens?.idToken?.payload?.sub

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User ID not found in session'
      })
    }
    const client = getServerUserPoolDataClient()
    const { data: profiles } = await client.models.UserProfile.list(contextSpec, {
      filter: { userId: { eq: userId } }
    })

      const userProfile = profiles?.[0]
      if (!userProfile?.stripeCustomerId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'No Stripe customer found. Please complete your subscription setup first.'
        })
      }

      // Determine return URL
      const baseUrl = getBaseUrl(event)
      const finalReturnUrl = return_url || `${baseUrl}/settings/billing`

      // Configure session options based on flow type
      const sessionOptions: Stripe.BillingPortal.SessionCreateParams = {
        customer: userProfile.stripeCustomerId,
        return_url: finalReturnUrl
      }

      // Add flow-specific configuration
      switch (flow_type) {
        case 'subscription_cancel':
          // Only add subscription_cancel flow if user has a paid subscription
          const subscriptionId = await getSubscriptionId(stripe, userProfile.stripeCustomerId)
          if (subscriptionId) {
            sessionOptions.flow_data = {
              type: 'subscription_cancel',
              subscription_cancel: {
                subscription: subscriptionId
              }
            }
          }
          break

        case 'subscription_update':
          const updateSubscriptionId = await getSubscriptionId(stripe, userProfile.stripeCustomerId)
          if (updateSubscriptionId) {
            sessionOptions.flow_data = {
              type: 'subscription_update',
              subscription_update: {
                subscription: updateSubscriptionId
              }
            }
          }
          break

        case 'payment_method_update':
          sessionOptions.flow_data = {
            type: 'payment_method_update'
          }
          break

        case 'subscription_update_confirm':
          const confirmSubscriptionId = await getSubscriptionId(stripe, userProfile.stripeCustomerId)
          if (confirmSubscriptionId) {
            sessionOptions.flow_data = {
              type: 'subscription_update_confirm',
              subscription_update_confirm: {
                subscription: confirmSubscriptionId,
                discount_id: body.discount_id
              }
            }
          }
          break
      }

      // Use custom configuration if provided
      if (configuration_id) {
        sessionOptions.configuration = configuration_id
      }

      const portalSession = await stripe.billingPortal.sessions.create(sessionOptions)

      return {
        success: true,
        data: {
          url: portalSession.url,
          created: portalSession.created,
          expires_at: portalSession.created + 3600,
          customer: userProfile.stripeCustomerId,
          flow_type,
          return_url: finalReturnUrl
        }
      }
  })
})

// Helper function to get subscription ID from customer
async function getSubscriptionId(stripe: Stripe, customerId: string): Promise<string | undefined> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    })

    return subscriptions.data[0]?.id
  } catch (error) {
    console.error('Error fetching subscription ID:', error)
    return undefined
  }
}

// Helper function to get base URL
function getBaseUrl(event: any): string {
  const headers = getHeaders(event)
  const host = headers.host || headers['x-forwarded-host'] || 'localhost:3000'
  const protocol = headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}
