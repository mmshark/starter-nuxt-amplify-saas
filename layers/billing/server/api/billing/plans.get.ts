import { withAmplifyPublic, getServerPublicDataClient } from '@starter-nuxt-amplify-saas/amplify/server/utils/amplify'

export default defineEventHandler(async (event) => {
  try {
    return await withAmplifyPublic(async (contextSpec) => {
      const client = getServerPublicDataClient()
      const { data: plans, errors } = await client.models.SubscriptionPlan.list(contextSpec, {
        filter: { isActive: { eq: true } }
      })

      if (errors && errors.length > 0) {
        console.error('GraphQL errors:', errors)
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch subscription plans' })
      }

      const transformedPlans = (plans || []).map((plan) => ({
        id: plan.planId,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.priceCurrency,
        stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
        stripeYearlyPriceId: plan.stripeYearlyPriceId,
        stripeProductId: plan.stripeProductId,
        yearlySavings: Math.max(0, Math.round(((plan.monthlyPrice * 12) - plan.yearlyPrice) * 100) / 100)
      }))

      return { success: true, data: { plans: transformedPlans, count: transformedPlans.length } }
    })
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch subscription plans'
    })
  }
})
