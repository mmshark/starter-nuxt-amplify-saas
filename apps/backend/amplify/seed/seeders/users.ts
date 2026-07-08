import * as auth from 'aws-amplify/auth'
import { createAndSignUpUser, signInUser, addToUserGroup } from '@aws-amplify/seed'
import { createAmplifyClient } from '../utils/amplify'
import { ensureStripeSecret, createStripeClient } from '../utils/stripe'

export type SeedUser = {
  username: string
  password: string
  attributes?: Record<string, string>
  groups?: string[]
  planId?: string
  billingInterval?: 'month' | 'year'
  paymentMethod?: {
    type: 'card'
    card: {
      number: string
      exp_month: number
      exp_year: number
      cvc: string
    }
  }
}

export type SeedUsersFile = { users: SeedUser[] }

const PROFILE_POLL_ATTEMPTS = 10
const PROFILE_POLL_DELAY_MS = 500

/**
 * The post-confirmation trigger creates the UserProfile (with its Stripe
 * customer id) asynchronously relative to sign-up completing. Poll for it
 * instead of guessing a fixed delay so the seeder works whether the trigger
 * finishes in 50ms or 4s, and returns null (rather than hanging) if the
 * trigger never runs (e.g. it's disabled/broken in this sandbox).
 */
async function pollForUserProfile(client: any, userId: string): Promise<any | null> {
  for (let attempt = 1; attempt <= PROFILE_POLL_ATTEMPTS; attempt++) {
    const { data: profile } = await client.models.UserProfile.get({ userId });
    if (profile?.stripeCustomerId) {
      return profile;
    }
    if (attempt < PROFILE_POLL_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, PROFILE_POLL_DELAY_MS));
    }
  }
  return null;
}

/** Look up a workspace by slug so re-running the seeder doesn't create duplicates. */
async function findWorkspaceBySlug(client: any, slug: string): Promise<any | null> {
  const { data: workspaces } = await client.models.Workspace.list({
    filter: { slug: { eq: slug } }
  });
  return workspaces?.[0] ?? null;
}

/** Look up an existing membership so re-running the seeder doesn't create duplicates. */
async function findWorkspaceMember(client: any, workspaceId: string, userId: string): Promise<any | null> {
  const { data: members } = await client.models.WorkspaceMember.list({
    filter: { workspaceId: { eq: workspaceId }, userId: { eq: userId } }
  });
  return members?.[0] ?? null;
}

async function createWorkspaceSubscription(client: any, workspaceId: string, userId: string, planId: string, billingInterval: 'month' | 'year', paymentMethod?: SeedUser['paymentMethod']): Promise<void> {
  try {
    // Idempotent: skip if this workspace already has a subscription row.
    const { data: existingSubscriptions } = await client.models.WorkspaceSubscription.list({
      filter: { workspaceId: { eq: workspaceId } }
    });
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      console.log(`ℹ️  WorkspaceSubscription already exists for workspace ${workspaceId}, skipping`);
      return;
    }

    // Verify the plan exists
    const { data: plans } = await client.models.SubscriptionPlan.list({
      filter: { planId: { eq: planId } }
    });

    if (!plans || plans.length === 0) {
      console.warn(`⚠️  Plan ${planId} not found, skipping subscription creation for user ${userId}`);
      return;
    }

    // Get the user profile to get the real Stripe customer ID
    const { data: userProfile } = await client.models.UserProfile.get({ userId });
    if (!userProfile) {
      console.warn(`⚠️  UserProfile not found for user ${userId}, skipping subscription`);
      return;
    }

    const plan = plans[0];

    // For free plans, don't create Stripe subscription
    if (planId === 'free') {
      const now = new Date();
      const subscription = {
        workspaceId,
        planId,
        stripeCustomerId: userProfile.stripeCustomerId,
        stripeSubscriptionId: null, // No Stripe subscription for free plan
        status: 'active' as const,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: null, // Free plan never expires
        cancelAtPeriodEnd: false,
        billingInterval: 'month' as const,
      };

      await client.models.WorkspaceSubscription.create(subscription);
      console.log(`✅ Created free workspace subscription for workspace ${workspaceId} on plan ${planId}`);
      return;
    }

    // For paid plans, create real Stripe subscription
    const stripeSecretKey = await ensureStripeSecret();
    const stripe = createStripeClient(stripeSecretKey);

    // Get the correct price ID based on billing interval
    const priceId = billingInterval === 'month'
      ? plan.stripeMonthlyPriceId
      : plan.stripeYearlyPriceId;

    if (!priceId) {
      console.warn(`⚠️  No ${billingInterval} price found for plan ${planId}, skipping subscription creation`);
      return;
    }

    // Create payment method in Stripe if provided
    let defaultPaymentMethod = null;
    if (paymentMethod) {
      try {
        const paymentMethodData = await stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: paymentMethod.card.number,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year,
            cvc: paymentMethod.card.cvc,
          },
        });

        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodData.id, {
          customer: userProfile.stripeCustomerId,
        });

        // Set as default payment method
        await stripe.customers.update(userProfile.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodData.id,
          },
        });

        defaultPaymentMethod = paymentMethodData.id;
        console.log(`✅ Created payment method ${paymentMethodData.id} for user ${userId}`);
      } catch (error) {
        console.warn(`⚠️  Could not create payment method for user ${userId}:`, error);
      }
    }

    // Create subscription in Stripe
    const subscriptionOptions: any = {
      customer: userProfile.stripeCustomerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    };

    // If we have a payment method, use it; otherwise use default_incomplete
    if (defaultPaymentMethod) {
      subscriptionOptions.default_payment_method = defaultPaymentMethod;
    } else {
      subscriptionOptions.payment_behavior = 'default_incomplete';
      subscriptionOptions.payment_settings = { save_default_payment_method: 'on_subscription' };
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionOptions);

    console.log(`✅ Created Stripe subscription ${stripeSubscription.id} for user ${userId}`);

    // Stripe API 2025-08-27.basil (stripe-node v18) moved current_period_start/end
    // from the Subscription object down to each SubscriptionItem.
    const firstItem = stripeSubscription.items?.data?.[0];
    const currentPeriodStart = firstItem?.current_period_start ?? Math.floor(Date.now() / 1000);
    const currentPeriodEnd = firstItem?.current_period_end ?? currentPeriodStart;

    // Create subscription record in DynamoDB
    const subscription = {
      workspaceId,
      planId,
      stripeCustomerId: userProfile.stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status as 'active' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'past_due' | 'canceled' | 'unpaid',
      currentPeriodStart: new Date(currentPeriodStart * 1000).toISOString(),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      billingInterval,
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
    };

    await client.models.WorkspaceSubscription.create(subscription);
    console.log(`✅ Created workspace subscription for workspace ${workspaceId} on plan ${planId} (${billingInterval})`);
  } catch (error) {
    console.error(`❌ Error creating subscription for user ${userId}:`, error);
    // Don't throw - continue with next user
  }
}

async function seedUser(client: any, user: SeedUser): Promise<void> {

  // Create or sign in user following AWS Amplify best practices
  // Reference: https://docs.amplify.aws/react/deploy-and-host/sandbox-environments/seed/
  try {
    // Attempt to create and sign up the user
    await createAndSignUpUser({
      username: user.username,
      password: user.password,
      signInFlow: 'Password',
      signInAfterCreation: true, // Sign in after creation
      userAttributes: user.attributes
    });
    console.log(`✅ Created user: ${user.username}`);
  } catch (err) {
    const error = err as Error;
    if (error.name === 'UsernameExistsError') {
      console.log(`ℹ️  User already exists: ${user.username}, signing in...`);
      // User exists, sign them in instead
      await signInUser({
        username: user.username,
        password: user.password,
        signInFlow: 'Password'
      });
      console.log(`✅ Signed in existing user: ${user.username}`);
    } else {
      throw err;
    }
  }

  // Add groups if any
  if (user.groups && user.groups.length > 0) {
    for (const group of user.groups) {
      try {
        await addToUserGroup({ username: user.username }, group);
        console.log(`✅ Added user ${user.username} to group ${group}`);
      } catch (e) {
        console.warn(`⚠️  Could not add user ${user.username} to group ${group}:`, e);
        // Ignore if group does not exist in sandbox
      }
    }
  }

  // Now process the user (either new or existing, both are signed in at this point).
  // The post-confirmation trigger already creates the UserProfile, the personal
  // Workspace/WorkspaceMember and the Stripe customer (via ensureWorkspaceBilling)
  // synchronously on sign-up. Poll/look those up instead of re-creating them, so
  // running this seeder repeatedly against the same sandbox stays idempotent.
  try {
    // Get current user info
    const currentUser = await auth.getCurrentUser();
    const userId = currentUser.userId;
    const slug = `${userId}-personal`;

    let userProfile = await pollForUserProfile(client, userId);

    if (!userProfile) {
      // Fallback: the trigger didn't create a profile in time (or failed).
      // Create the Stripe customer + UserProfile manually so seeding can continue.
      console.warn(`⚠️  UserProfile not created by post-confirmation trigger in time for ${user.username}, creating manually as a fallback`);
      const stripeSecretKey = await ensureStripeSecret();
      const stripe = createStripeClient(stripeSecretKey);

      const name = user.attributes?.name ||
                   (user.attributes?.given_name && user.attributes?.family_name
                     ? `${user.attributes.given_name} ${user.attributes.family_name}`
                     : user.attributes?.given_name || user.attributes?.family_name || '');

      const stripeCustomer = await stripe.customers.create({
        email: user.username,
        name: name,
        metadata: {
          userId: userId
        }
      });

      const { data: existingProfile } = await client.models.UserProfile.get({ userId });
      if (existingProfile) {
        const { data } = await client.models.UserProfile.update({
          userId: userId,
          stripeCustomerId: stripeCustomer.id,
        });
        userProfile = data;
      } else {
        const { data } = await client.models.UserProfile.create({
          userId: userId,
          stripeCustomerId: stripeCustomer.id,
        });
        userProfile = data;
      }
      console.log(`✅ Created Stripe customer ${stripeCustomer.id} for user: ${user.username} (fallback)`);
    } else {
      console.log(`ℹ️  Using trigger-created Stripe customer ${userProfile.stripeCustomerId} for user: ${user.username}`);
    }

    // Reuse the personal workspace created by the trigger; only create one if
    // it's genuinely missing (idempotent across repeated seed runs).
    let workspace = await findWorkspaceBySlug(client, slug);
    if (!workspace) {
      console.warn(`⚠️  Personal workspace not found for ${user.username} (slug ${slug}), creating manually as a fallback`);
      const { data } = await client.models.Workspace.create({
        name: `${user.username}'s Workspace`,
        slug,
        description: 'Personal workspace',
        ownerId: userId,
        isPersonal: true,
        memberCount: 1,
      });
      workspace = data;
      console.log(`✅ Created personal workspace for user: ${user.username}`);
    } else {
      console.log(`ℹ️  Using existing personal workspace ${workspace.id} for user: ${user.username}`);
    }

    // Ensure the OWNER membership exists without creating a duplicate.
    const existingMember = await findWorkspaceMember(client, workspace!.id, userId);
    if (!existingMember) {
      await client.models.WorkspaceMember.create({
        workspaceId: workspace!.id,
        userId: userId,
        email: user.username,
        name: user.attributes?.name || user.username,
        role: 'OWNER',
        joinedAt: new Date().toISOString(),
      });
      console.log(`✅ Added user as OWNER to personal workspace`);
    } else {
      console.log(`ℹ️  User ${user.username} is already a member of the personal workspace`);
    }

    // Create a subscription whenever a plan is specified. No fixture user set
    // billingInterval, so gating on it meant paid users never got a
    // subscription (BUG-06). Default the interval to 'month' (the free-plan
    // path ignores it anyway).
    if (user.planId) {
      await createWorkspaceSubscription(client, workspace!.id, userId, user.planId, user.billingInterval ?? 'month', user.paymentMethod);
    }
  } catch (error) {
    console.warn(`⚠️  Could not provision workspace/profile for ${user.username}:`, error);
  }

  try {
    await auth.signOut();
  } catch {
    // Ignore signOut failures when Auth isn't fully configured
  }
}

export async function seedUsers(usersFile: SeedUsersFile): Promise<void> {
  const client = createAmplifyClient();

  console.log(`👥 Seeding ${usersFile.users.length} users...`);

  let successCount = 0;
  let failCount = 0;

  for (const user of usersFile.users) {
    try {
      await seedUser(client, user);
      successCount++;
    } catch (error: any) {
      failCount++;

      // Check if it's an auth error with existing user
      if (error.name === 'NotAuthorizedException' && error.message?.includes('Incorrect username or password')) {
        console.error(`❌ Failed to seed user ${user.username}: User exists but cannot authenticate.`);
        console.error(`   This usually means the user is in an invalid state (FORCE_CHANGE_PASSWORD or UNCONFIRMED).`);
        console.error(`   Solution: Delete this user from AWS Cognito Console and run seed again.`);
      } else {
        console.error(`❌ Failed to seed user ${user.username}:`, error.message || error);
      }
      // Continue with next user
    }
  }

  console.log(`\n📊 Seeding Summary:`);
  console.log(`   ✅ Success: ${successCount} users`);
  console.log(`   ❌ Failed: ${failCount} users`);

  console.log('✅ Users seeded successfully');
}
