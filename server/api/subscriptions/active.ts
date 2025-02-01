import { defineEventHandler } from 'h3';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-08-27' });

export default defineEventHandler(async (event) => {
  try {
    // For testing purposes.
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
      body: subscription
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: 'Failed to retrieve subscription', details: error.message }
    };
  }
});