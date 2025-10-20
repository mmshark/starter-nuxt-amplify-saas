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

  // Get query parameters
  const query = getQuery(event)
  const limit = Number(query.limit) || 10
  const startingAfter = query.startingAfter as string

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
    const client = getServerUserPoolDataClient()
    const { data: profiles } = await client.models.UserProfile.list(contextSpec, {
      filter: { userId: { eq: userId } }
    })

      const userProfile = profiles?.[0]
      if (!userProfile?.stripeCustomerId) {
        return {
          success: true,
          data: {
            invoices: [],
            hasMore: false,
            totalCount: 0
          }
        }
      }

    // Fetch invoices from Stripe
      const invoicesParams: Stripe.InvoiceListParams = {
        customer: userProfile.stripeCustomerId,
        limit,
        expand: ['data.payment_intent'],
        status: 'paid' // Only show paid invoices
      }

      if (startingAfter) {
        invoicesParams.starting_after = startingAfter
      }

      const invoices = await stripe.invoices.list(invoicesParams)

      // Transform invoices for frontend
      const transformedInvoices = invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        date: new Date(invoice.created * 1000).toISOString(),
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        amount: invoice.amount_paid / 100, // Convert cents to dollars
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        description: invoice.description || getInvoiceDescription(invoice),
        downloadUrl: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
        lines: invoice.lines.data.map(line => ({
          description: line.description,
          amount: line.amount / 100,
          quantity: line.quantity,
          period: line.period ? {
            start: new Date(line.period.start * 1000).toISOString(),
            end: new Date(line.period.end * 1000).toISOString()
          } : null
        })),
        subtotal: invoice.subtotal / 100,
        tax: invoice.tax ? invoice.tax / 100 : 0,
        total: invoice.total / 100,
        paymentMethod: getPaymentMethodInfo(invoice)
      }))

      return {
        success: true,
        data: {
          invoices: transformedInvoices,
          hasMore: invoices.has_more,
          totalCount: invoices.data.length
        }
      }
  })
})

// Helper function to generate invoice description
function getInvoiceDescription(invoice: Stripe.Invoice): string {
  if (invoice.lines.data.length > 0) {
    const line = invoice.lines.data[0]
    if (line.description) {
      return line.description
    }

    // Generate description from subscription
    if (line.price?.nickname) {
      return line.price.nickname
    }

    if (line.price?.product && typeof line.price.product === 'object') {
      return line.price.product.name || 'Subscription'
    }
  }

  return 'Subscription Payment'
}

// Helper function to extract payment method info
function getPaymentMethodInfo(invoice: Stripe.Invoice) {
  const paymentIntent = invoice.payment_intent

  if (paymentIntent && typeof paymentIntent === 'object') {
    const charges = paymentIntent.charges

    if (charges && charges.data && charges.data.length > 0) {
      const charge = charges.data[0]
      const paymentMethod = charge.payment_method_details

      if (paymentMethod?.card) {
        return {
          type: 'card',
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year
        }
      }
    }
  }

  return null
}
