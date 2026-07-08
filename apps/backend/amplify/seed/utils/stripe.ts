import Stripe from 'stripe'
import { getSecret, setSecret } from '@aws-amplify/seed'

export async function ensureStripeSecret(): Promise<string> {
  try {
    return await getSecret('STRIPE_SECRET_KEY')
  } catch {
    const fromEnv = process.env.STRIPE_SECRET_KEY
    if (!fromEnv) {
      throw new Error('Missing STRIPE_SECRET_KEY. Set sandbox secret or env var.')
    }
    await setSecret('STRIPE_SECRET_KEY', fromEnv)
    return fromEnv
  }
}

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  })
}

export interface StripeProductWithPrices {
  product: Stripe.Product;
  monthlyPrice?: Stripe.Price;
  yearlyPrice?: Stripe.Price;
}

export async function fetchStripeProductsWithPrices(stripe: Stripe): Promise<StripeProductWithPrices[]> {
  console.log('🔍 Fetching products from Stripe API...');

  // Get all active products
  const products = await stripe.products.list({
    active: true,
    limit: 100,
  });

  // Get all active prices
  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
  });

  console.log(`📦 Found ${products.data.length} products and ${prices.data.length} prices`);

  // Group prices by product
  const productsWithPrices: StripeProductWithPrices[] = products.data.map(product => {
    const productPrices = prices.data.filter(price => price.product === product.id);

    const monthlyPrice = productPrices.find(price =>
      price.recurring?.interval === 'month'
    );

    const yearlyPrice = productPrices.find(price =>
      price.recurring?.interval === 'year'
    );

    return {
      product,
      monthlyPrice,
      yearlyPrice,
    };
  });

  return productsWithPrices;
}

export function centsToDecimal(cents: number): number {
  return cents / 100
}
