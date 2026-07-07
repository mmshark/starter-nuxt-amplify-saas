import Stripe from 'stripe'
import { withAmplifyAuth, getServerUserPoolDataClient } from '@mmshark/amplify-layer/server/utils/amplify'
import { invokeWorkspaceMembership } from '@mmshark/amplify-layer/server/utils/workspaceMembership'
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth/server'

const BILLING_INTERVALS = ['monthly', 'yearly'] as const
type BillingInterval = (typeof BILLING_INTERVALS)[number]

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
    throw createError({
      statusCode: 500,
      statusMessage: 'appBaseUrl is not configured'
    })
  }

  // Parse request body. `priceId` is intentionally NOT accepted from the client
  // (review M3 / Phase 3 Task 3.2) — it is looked up server-side from planId +
  // billingInterval so a caller can never redirect a checkout to an arbitrary price.
  const body = await readBody(event)
  const { workspaceId, planId, billingInterval } = body || {}

  if (!workspaceId || typeof workspaceId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing required parameter: workspaceId' })
  }
  if (!planId || typeof planId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing required parameter: planId' })
  }
  if (!BILLING_INTERVALS.includes(billingInterval)) {
    throw createError({ statusCode: 400, statusMessage: 'billingInterval must be "monthly" or "yearly"' })
  }
  const interval = billingInterval as BillingInterval

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

    // userPool client: tenant reads/writes are authorized by the caller's
    // workspace group claims (group-per-workspace model) — defense-in-depth
    // on top of the explicit OWNER check below.
    const client = getServerUserPoolDataClient()

    // Authorize: only the workspace OWNER may start a checkout (manage-billing).
    const { data: members } = await client.models.WorkspaceMember.list(contextSpec, {
      filter: { workspaceId: { eq: workspaceId }, userId: { eq: userId } }
    })
    const membership = members?.[0]
    if (!membership || membership.role !== 'OWNER') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only the workspace owner can manage billing'
      })
    }

    // Look up the Stripe price server-side. SubscriptionPlan is readable by
    // any authenticated user, so the caller's userPool client covers it.
    const { data: plan } = await client.models.SubscriptionPlan.get(contextSpec, { planId })

    if (!plan || plan.isActive === false) {
      throw createError({ statusCode: 400, statusMessage: `Unknown or inactive plan: ${planId}` })
    }

    const priceId = interval === 'yearly' ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId
    if (!priceId) {
      throw createError({
        statusCode: 400,
        statusMessage: `Plan "${planId}" has no configured ${interval} price`
      })
    }

    // Resolve the WORKSPACE's Stripe customer — never per-user. Tenant tables
    // are READ-ONLY for client principals, so this route never writes
    // WorkspaceSubscription itself: reads use the caller's userPool client
    // (readerGroups rule), and if the row is unexpectedly missing (workspace
    // creation provisions billing atomically, so this is a self-heal) it is
    // (re)provisioned via the workspace-membership Lambda, which re-verifies
    // the caller is the workspace OWNER and holds the only write grant.
    const { data: workspaceSubscription } = await client.models.WorkspaceSubscription.get(
      contextSpec,
      { workspaceId }
    )
    let stripeCustomerId = workspaceSubscription?.stripeCustomerId
    if (!stripeCustomerId) {
      const accessToken = session.tokens?.accessToken?.toString()
      if (!accessToken) {
        throw createError({
          statusCode: 401,
          statusMessage: 'No access token available for this session'
        })
      }
      const ensured = await invokeWorkspaceMembership<{ stripeCustomerId: string }>(
        contextSpec,
        accessToken,
        { action: 'ensureBilling', workspaceId }
      )
      stripeCustomerId = ensured.stripeCustomerId
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      subscription_data: {
        // The webhook resolves the workspace from this metadata (Task 3.3) —
        // it never has a Cognito session to look the workspace up any other way.
        metadata: { workspaceId }
      },
      metadata: {
        userId,
        planId,
        billingInterval: interval,
        workspaceId
      },
      success_url: `${baseUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
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
