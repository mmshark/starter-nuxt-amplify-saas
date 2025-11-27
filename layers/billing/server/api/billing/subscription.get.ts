import { getServerUserPoolDataClient, withAmplifyAuth } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'
import { fetchAuthSession } from 'aws-amplify/auth/server'
import Stripe from 'stripe'

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

    const query = getQuery(event)
    const workspaceId = query.workspaceId as string

    if (!workspaceId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Workspace ID is required'
      })
    }

    const client = getServerUserPoolDataClient()

    // Validate access: Check if user is a member of the workspace
    const { data: members } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: {
        workspaceId: { eq: workspaceId },
        userId: { eq: userId }
      }
    })

    if (members.length === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied to workspace'
      })
    }

    const { data: workspaceSubscription } = await client.models.WorkspaceSubscription.get(
      contextSpec,
      { workspaceId },
      {
        selectionSet: [
          'workspaceId', 'planId', 'stripeSubscriptionId', 'stripeCustomerId',
          'status', 'currentPeriodStart', 'currentPeriodEnd', 'cancelAtPeriodEnd',
          'billingInterval', 'trialStart', 'trialEnd',
          'plan.planId', 'plan.name', 'plan.description',
          'plan.monthlyPrice', 'plan.yearlyPrice', 'plan.priceCurrency'
        ]
      }
    )

    if (!workspaceSubscription) {
      // Return null subscription instead of 404 for better UX (e.g. new workspace)
      return {
        success: true,
        data: {
          subscription: null,
          plan: null,
          paymentMethod: null
        }
      }
    }

    // Get payment method from Stripe if workspace has a Stripe customer ID
    let paymentMethod = null
    if (workspaceSubscription.stripeCustomerId) {
      try {
        // Get customer's default payment method (modern) — avoid legacy default_source
        const customer = await stripe.customers.retrieve(workspaceSubscription.stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method']
        })

        if (customer && !customer.deleted) {
          let paymentMethodData = null

          // Prefer modern default payment method
          const defaultPaymentMethod = customer.invoice_settings?.default_payment_method
          if (defaultPaymentMethod && typeof defaultPaymentMethod === 'object') {
            paymentMethodData = defaultPaymentMethod
          } else {
            // Fallback: any attached card-type payment methods
            const paymentMethods = await stripe.paymentMethods.list({
              customer: workspaceSubscription.stripeCustomerId,
              type: 'card',
              limit: 10
            })

            if (paymentMethods.data.length > 0) {
              paymentMethodData = paymentMethods.data[0]
            }
          }

          // Extract payment method details
          if (paymentMethodData?.card) {
            paymentMethod = {
              type: 'card',
              brand: paymentMethodData.card.brand,
              last4: paymentMethodData.card.last4,
              expMonth: paymentMethodData.card.exp_month,
              expYear: paymentMethodData.card.exp_year
            }
          }
        }
      } catch (stripeError) {
        console.error('Could not fetch payment method from Stripe:', stripeError)
        // Continue without payment method - not critical
      }
    }

    // Get plan features
    const planFeatures = []

    return {
      success: true,
      data: {
        subscription: {
          planId: workspaceSubscription.planId,
          status: workspaceSubscription.status,
          currentPeriodStart: workspaceSubscription.currentPeriodStart,
          currentPeriodEnd: workspaceSubscription.currentPeriodEnd,
          cancelAtPeriodEnd: workspaceSubscription.cancelAtPeriodEnd,
          billingInterval: workspaceSubscription.billingInterval,
          trialStart: workspaceSubscription.trialStart,
          trialEnd: workspaceSubscription.trialEnd,
          stripeSubscriptionId: workspaceSubscription.stripeSubscriptionId,
          stripeCustomerId: workspaceSubscription.stripeCustomerId
        },
        plan: {
          id: workspaceSubscription.plan?.planId || workspaceSubscription.planId,
          name: workspaceSubscription.plan?.name || 'Unknown Plan',
          description: workspaceSubscription.plan?.description,
          monthlyPrice: workspaceSubscription.plan?.monthlyPrice || 0,
          yearlyPrice: workspaceSubscription.plan?.yearlyPrice || 0,
          currency: workspaceSubscription.plan?.priceCurrency || 'USD',
          features: planFeatures,
          // For backward compatibility with current components
          price: workspaceSubscription.billingInterval === 'year'
            ? Math.round((workspaceSubscription.plan?.yearlyPrice || 0) / 12)
            : workspaceSubscription.plan?.monthlyPrice || 0,
          interval: workspaceSubscription.billingInterval === 'year' ? 'year' : 'month'
        },
        paymentMethod
      }
    }
  })
})
