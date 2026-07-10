import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../data/resource'
import { createAndSignUpUser, signInUser, addToUserGroup } from '@aws-amplify/seed'
import { loadAmplifyOutputs } from '../utils/amplify'
import { ensureStripeSecret, createStripeClient, fetchStripeProductsWithPrices, centsToDecimal, type StripeProductWithPrices } from '../utils/stripe'

// `SubscriptionPlan` writes require the Cognito `admin` group (see
// amplify/data/resource.ts). The public apiKey is read-only, so the seeder must
// act as an admin-group user. This is a dedicated, sandbox-only seed identity —
// same `test+*@ontopix.ai` / TestPassword123! convention as the user fixtures.
const SEED_ADMIN = {
  username: 'test+seedadmin@ontopix.ai',
  password: 'TestPassword123!',
}

/**
 * Establish an authenticated session for a user in the `admin` group so
 * `SubscriptionPlan` mutations are authorized. Creates the seed admin if it does
 * not exist, ensures the group membership, then signs in AGAIN so the fresh
 * token actually carries the `cognito:groups` claim (a group added after the
 * first sign-in is not reflected in the already-issued token).
 */
async function ensureAdminSession(): Promise<void> {
  // Re-assert the Amplify config: the @aws-amplify/seed secret helpers used
  // earlier in the seed (ensureStripeSecret) reconfigure the Amplify singleton
  // and drop the Cognito auth config, which the sign-up/sign-in calls need.
  await loadAmplifyOutputs();

  try {
    await createAndSignUpUser({
      username: SEED_ADMIN.username,
      password: SEED_ADMIN.password,
      signInFlow: 'Password',
      signInAfterCreation: true,
    });
    console.log(`✅ Created seed admin: ${SEED_ADMIN.username}`);
  } catch (err) {
    if ((err as Error).name === 'UsernameExistsError') {
      await signInUser({
        username: SEED_ADMIN.username,
        password: SEED_ADMIN.password,
        signInFlow: 'Password',
      });
    } else {
      throw err;
    }
  }

  await addToUserGroup({ username: SEED_ADMIN.username }, 'admin');

  // Re-sign-in so the new token includes the `admin` group claim.
  await signInUser({
    username: SEED_ADMIN.username,
    password: SEED_ADMIN.password,
    signInFlow: 'Password',
  });
  console.log(`✅ Seed admin authenticated with 'admin' group`);
}

function parseFeatures(featuresString?: string): string[] {
  if (!featuresString) return [];
  return featuresString.split('|').map(feature => feature.trim());
}

function extractPlanMetadata(product: import('stripe').Stripe.Product) {
  const metadata = product.metadata || {};

  const trialPeriodDays = metadata.trial_period_days
    ? parseInt(metadata.trial_period_days, 10)
    : undefined;

  return {
    appPlanId: metadata.app_plan_id || product.id,
    monthlyPriceAmount: parseFloat(metadata.monthly_price || '0'),
    yearlyPriceAmount: parseFloat(metadata.yearly_price || '0'),
    currency: metadata.currency || 'usd',
    features: parseFeatures(metadata.features),
    // Optional free-trial length driven by Stripe product metadata (E05).
    trialPeriodDays: trialPeriodDays !== undefined && !Number.isNaN(trialPeriodDays)
      ? trialPeriodDays
      : undefined,
  };
}

async function upsertSubscriptionPlan(client: any, planData: StripeProductWithPrices): Promise<void> {
  const { product, monthlyPrice, yearlyPrice } = planData;
  const metadata = extractPlanMetadata(product);

  const subscriptionPlan = {
    planId: metadata.appPlanId,
    name: product.name,
    description: product.description || '',
    monthlyPrice: monthlyPrice ? centsToDecimal(monthlyPrice.unit_amount!) : metadata.monthlyPriceAmount / 100,
    yearlyPrice: yearlyPrice ? centsToDecimal(yearlyPrice.unit_amount!) : metadata.yearlyPriceAmount / 100,
    priceCurrency: metadata.currency.toUpperCase(),
    stripeMonthlyPriceId: monthlyPrice?.id,
    stripeYearlyPriceId: yearlyPrice?.id,
    stripeProductId: product.id,
    isActive: product.active,
    // Persist the parsed metadata the UI needs (E05) — previously dropped.
    features: metadata.features,
    ...(metadata.trialPeriodDays !== undefined ? { trialPeriodDays: metadata.trialPeriodDays } : {}),
  };

  // Check if plan exists using list with filter
  const { data: existing, errors: listErrors } = await client.models.SubscriptionPlan.list({
    filter: { planId: { eq: subscriptionPlan.planId } }
  });
  if (listErrors && listErrors.length > 0) {
    throw new Error(`Failed to look up plan ${subscriptionPlan.planId}: ${JSON.stringify(listErrors)}`);
  }

  if (existing && existing.length > 0) {
    console.log(`🔄 Updating plan: ${subscriptionPlan.name} (${subscriptionPlan.planId})`);
    const { errors } = await client.models.SubscriptionPlan.update(subscriptionPlan);
    if (errors && errors.length > 0) {
      throw new Error(`Failed to update plan ${subscriptionPlan.planId}: ${JSON.stringify(errors)}`);
    }
  } else {
    console.log(`➕ Creating plan: ${subscriptionPlan.name} (${subscriptionPlan.planId})`);
    const { errors } = await client.models.SubscriptionPlan.create(subscriptionPlan);
    if (errors && errors.length > 0) {
      throw new Error(`Failed to create plan ${subscriptionPlan.planId}: ${JSON.stringify(errors)}`);
    }
  }

  console.log(`✅ Successfully synced: ${subscriptionPlan.name}`);
}

export async function syncPlansFromStripe(): Promise<void> {
  console.log('🔄 Syncing plans from Stripe API to DynamoDB...');

  const stripeSecret = await ensureStripeSecret();
  const stripe = createStripeClient(stripeSecret);

  // Fetch products and prices from Stripe
  const productsWithPrices = await fetchStripeProductsWithPrices(stripe);

  if (productsWithPrices.length === 0) {
    console.log('⚠️  No active products found in Stripe');
    return;
  }

  // Authenticate as an admin-group user — SubscriptionPlan is client-read-only
  // (apiKey/authenticated) and only the `admin` group may write.
  await ensureAdminSession();
  const client = generateClient<Schema>({ authMode: 'userPool' });

  console.log(`📋 Syncing ${productsWithPrices.length} products to DynamoDB...`);

  for (const productData of productsWithPrices) {
    await upsertSubscriptionPlan(client, productData);
  }

  console.log('✅ Plans synced from Stripe API successfully!');
}
