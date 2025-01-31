import { defineEventHandler } from 'h3';
import Stripe from 'stripe';
import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth/server";
import { runAmplifyApi } from "~/server/utils/amplifyUtils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default defineEventHandler(async (event) => {
  try {
    const stripeCustomerId = 'cus_Rgk1mk7etVpA7R'

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return { status: 404, body: { error: 'No active subscription found' } };
    }

    const subscription = subscriptions.data[0];
    return {
      status: 200,
      body: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at,
        currency: subscription.currency,
        plan: subscription.plan.id,
      }
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: 'Failed to retrieve subscription', details: error.message }
    };
  }
});