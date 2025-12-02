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

async function createWorkspaceSubscription(client: any, workspaceId: string, userId: string, planId: string, billingInterval: 'month' | 'year', paymentMethod?: SeedUser['paymentMethod']): Promise<void> {
  try {
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

    // Create subscription record in DynamoDB
    const subscription = {
      workspaceId,
      planId,
      stripeCustomerId: userProfile.stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status as 'active' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'past_due' | 'canceled' | 'unpaid',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
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

  // Now process the user (either new or existing, both are signed in at this point)
  try {
    // Get current user info
    const currentUser = await auth.getCurrentUser();
    const userId = currentUser.userId;

    // Check if UserProfile exists
    const { data: existingProfile } = await client.models.UserProfile.get({ userId });

    let stripeCustomerId: string;

    if (!existingProfile || !existingProfile.stripeCustomerId || existingProfile.stripeCustomerId.startsWith('cus_seed_')) {
      // Create or update Stripe customer
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

      console.log(`✅ Created Stripe customer ${stripeCustomer.id} for user: ${user.username}`);
      stripeCustomerId = stripeCustomer.id;

      if (!existingProfile) {
        // Create new profile
        await client.models.UserProfile.create({
          userId: userId,
          stripeCustomerId: stripeCustomerId,
        });
        console.log(`✅ Created UserProfile for user: ${user.username}`);
      } else {
        // Update existing profile
        await client.models.UserProfile.update({
          userId: userId,
          stripeCustomerId: stripeCustomerId,
        });
        console.log(`✅ Updated UserProfile with real Stripe customer for user: ${user.username}`);
      }
    } else {
      // Use existing Stripe customer
      stripeCustomerId = existingProfile.stripeCustomerId;
      console.log(`ℹ️  Using existing Stripe customer ${stripeCustomerId} for user: ${user.username}`);
    }

    // Create personal workspace for user
    const workspace = await client.models.Workspace.create({
      name: `${user.username}'s Workspace`,
      slug: `${userId}-personal`,
      description: 'Personal workspace',
      ownerId: userId,
      isPersonal: true,
      memberCount: 1,
    });
    console.log(`✅ Created personal workspace for user: ${user.username}`);

    // Create WorkspaceMember
    await client.models.WorkspaceMember.create({
      workspaceId: workspace.data!.id,
      userId: userId,
      email: user.username,
      name: user.attributes?.name || user.username,
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
    });
    console.log(`✅ Added user as OWNER to personal workspace`);

    // Create subscription if planId is specified
    if (user.planId && user.billingInterval) {
      // Wait a bit for UserProfile to be created by post-confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get current user info for subscription creation
      const currentUser = await auth.getCurrentUser();
      await createWorkspaceSubscription(client, workspace.data!.id, currentUser.userId, user.planId, user.billingInterval, user.paymentMethod);
    }
  } catch (error) {
    console.warn(`⚠️  Could not create UserProfile for ${user.username}:`, error);
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
