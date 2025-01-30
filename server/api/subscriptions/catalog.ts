import { defineEventHandler } from 'h3';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default defineEventHandler(async (event) => {
  try {
    const products = await stripe.products.list({ active: true });
    const prices = await stripe.prices.list();

    console.log(JSON.stringify(products, null, 2));

    const subscriptionPlans = products.data.map(product => {
      const monthlyPrice = prices.data.find(p => p.product === product.id && p.recurring?.interval === 'month');
      const yearlyPrice = prices.data.find(p => p.product === product.id && p.recurring?.interval === 'year');
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        attributes: product.attributes,
        metadata: product.metadata,
        marketing_features: product.marketing_features,
        monthlyPrice: monthlyPrice ? {
          amount: monthlyPrice.unit_amount / 100,
          currency: monthlyPrice.currency
        } : null,
        yearlyPrice: yearlyPrice ? {
          amount: yearlyPrice.unit_amount / 100,
          currency: yearlyPrice.currency
        } : null
      };
    });

    return {
      status: 200,
      body: subscriptionPlans
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: 'Failed to fetch subscription plans', details: error.message }
    };
  }
});