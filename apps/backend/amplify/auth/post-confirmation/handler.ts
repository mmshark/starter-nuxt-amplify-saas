import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from "$amplify/env/post-confirmation";
import Stripe from 'stripe';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const userAttributes = event.request.userAttributes;
  const userId = userAttributes.sub;
  const email = userAttributes.email;
  const firstName = userAttributes.given_name || '';
  const lastName = userAttributes.family_name || '';
  const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';

  try {
    console.log(`Creating Stripe customer for user: ${email}`);
    const stripeCustomer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        userId: userId
      }
    });
    console.log(`Stripe customer created: ${stripeCustomer.id}`);


    // Create UserProfile with Stripe customer ID
    await client.models.UserProfile.create({
      userId: userId,
      stripeCustomerId: stripeCustomer.id,
    });
    console.log(`UserProfile created for user: ${userId}`);

    // Create Personal workspace for new user
    const workspace = await client.models.Workspace.create({
      name: 'Personal',
      slug: `${userId}-personal`,
      description: 'Personal workspace',
      ownerId: userId,
      isPersonal: true,
      memberCount: 1,
    });
    console.log(`Personal workspace created: ${workspace.data?.id}`);

    // Create WorkspaceMember with OWNER role
    await client.models.WorkspaceMember.create({
      workspaceId: workspace.data!.id,
      userId: userId,
      email: email!,
      name: name || email!,
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
    });
    console.log(`User added as OWNER to personal workspace`);

    // Get "free" plan
    const { data: plans } = await client.models.SubscriptionPlan.list({
      filter: { planId: { eq: 'free' } }
    });

    if (plans && plans.length > 0) {
      const freePlan = plans[0];
      // Create WorkspaceSubscription with free plan
      await client.models.WorkspaceSubscription.create({
        workspaceId: workspace.data!.id,
        planId: freePlan.planId,
        stripeSubscriptionId: null, // No actual Stripe subscription for free plan
        stripeCustomerId: stripeCustomer.id,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: null, // Free plan never expires
        cancelAtPeriodEnd: false,
        billingInterval: 'month',
        trialStart: null,
        trialEnd: null,
      });
      console.log(`WorkspaceSubscription created for personal workspace`);
    } else {
      console.warn(`Free plan not found, skipping subscription creation`);
    }

  } catch (error) {
    console.error('Error in post-confirmation handler:', error);
    // Don't throw error to prevent user registration from failing
    // Just log the error and continue
  }

  return event;
};
