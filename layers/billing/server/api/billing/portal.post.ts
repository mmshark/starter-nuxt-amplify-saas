import Stripe from 'stripe'
import { withAmplifyAuth, getServerUserPoolDataClient } from '@mmshark/amplify-layer/server/utils/amplify'
import { requirePermission } from '@mmshark/entitlements-layer/server/utils/requirePermission'
import { fetchAuthSession } from 'aws-amplify/auth/server'

const ALLOWED_FLOW_TYPES = [
  'subscription_update',
  'subscription_cancel',
  'payment_method_update',
  'subscription_update_confirm'
] as const
type FlowType = (typeof ALLOWED_FLOW_TYPES)[number]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe configuration missing'
    })
  }

  const baseUrl = config.public?.appBaseUrl
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'appBaseUrl is not configured' })
  }

  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2025-08-27.basil'
  })

  // Parse request body. `return_url`/`configuration_id` are intentionally NOT
  // accepted from the client (Phase 3 Task 3.2) — the return URL is derived
  // from server config, and custom portal configurations are not exposed.
  const body = await readBody(event).catch(() => ({}))
  const { workspaceId, discount_id } = body || {}
  const flow_type: FlowType = ALLOWED_FLOW_TYPES.includes(body?.flow_type)
    ? body.flow_type
    : 'subscription_update'

  if (!workspaceId || typeof workspaceId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing required parameter: workspaceId' })
  }

  // Authorize: only a caller whose role grants `manage-billing` (OWNER only,
  // see layers/entitlements/config/permissions.ts) may manage billing for
  // this workspace. `workspaceId` comes from the request body, not the
  // `currentWorkspaceId` cookie, so it's passed explicitly.
  await requirePermission(event, 'manage-billing', workspaceId)

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

    // userPool client: reads are authorized by the caller's workspace group
    // claims — defense-in-depth on top of the explicit requirePermission()
    // check above.
    const client = getServerUserPoolDataClient()

    // Resolve the customer from the WORKSPACE's subscription, never from UserProfile.
    const { data: workspaceSubscription } = await client.models.WorkspaceSubscription.get(contextSpec, {
      workspaceId
    })

    if (!workspaceSubscription?.stripeCustomerId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No Stripe customer found for this workspace. Please complete subscription setup first.'
      })
    }
    const stripeCustomerId = workspaceSubscription.stripeCustomerId

    const finalReturnUrl = `${baseUrl}/settings/billing`

    // Configure session options based on flow type
    const sessionOptions: Stripe.BillingPortal.SessionCreateParams = {
      customer: stripeCustomerId,
      return_url: finalReturnUrl
    }

    switch (flow_type) {
      case 'subscription_cancel': {
        const subscriptionId = await getSubscriptionId(stripe, stripeCustomerId)
        if (subscriptionId) {
          sessionOptions.flow_data = {
            type: 'subscription_cancel',
            subscription_cancel: { subscription: subscriptionId }
          }
        }
        break
      }

      case 'subscription_update': {
        const subscriptionId = await getSubscriptionId(stripe, stripeCustomerId)
        if (subscriptionId) {
          sessionOptions.flow_data = {
            type: 'subscription_update',
            subscription_update: { subscription: subscriptionId }
          }
        }
        break
      }

      case 'payment_method_update':
        sessionOptions.flow_data = { type: 'payment_method_update' }
        break

      case 'subscription_update_confirm': {
        const subscriptionId = await getSubscriptionId(stripe, stripeCustomerId)
        if (subscriptionId && typeof discount_id === 'string') {
          // Stripe API 2025-08-27.basil (stripe-node v18) requires `items`
          // (the subscription item being kept/updated) and `discounts` as an
          // array instead of the old singular `discount_id`. Keep the current
          // price unchanged and only apply the discount.
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const item = subscription.items.data[0]
          if (item?.id && item.price?.id) {
            sessionOptions.flow_data = {
              type: 'subscription_update_confirm',
              subscription_update_confirm: {
                subscription: subscriptionId,
                discounts: [{ coupon: discount_id, promotion_code: undefined }],
                items: [{ id: item.id, price: item.price.id }]
              }
            }
          }
        }
        break
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create(sessionOptions)

    return {
      success: true,
      data: {
        url: portalSession.url,
        created: portalSession.created,
        expires_at: portalSession.created + 3600,
        customer: stripeCustomerId,
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
