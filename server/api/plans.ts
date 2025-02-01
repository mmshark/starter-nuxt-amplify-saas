import { defineEventHandler } from 'h3';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-08-27' });

export default defineEventHandler(async (event) => {
  try {
    const products = await stripe.products.list({ active: true });

    const subscriptionPlans = await Promise.all(products.data.map(async product => {
      const prices = await stripe.prices.list({ product: product.id });
      return { ...product, prices: prices.data };
    }));

    return {
      status: 200,
      body: subscriptionPlans
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: 'Failed to fetch subscription plans', details: error instanceof Error ? error.message : String(error) }
    };
  }
});