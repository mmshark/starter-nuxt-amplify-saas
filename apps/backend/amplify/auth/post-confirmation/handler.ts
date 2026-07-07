import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from "$amplify/env/post-confirmation";
import Stripe from 'stripe';
import { ensureWorkspaceBilling } from '@mmshark/billing-layer/server/utils/ensureWorkspaceBilling';

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
    // Create UserProfile (user-level attributes; billing is workspace-scoped, see below)
    await client.models.UserProfile.create({
      userId: userId,
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

    // One Stripe customer PER WORKSPACE (not per user). Idempotent on workspaceId,
    // so a retried trigger invocation can never create a duplicate Stripe customer
    // or a duplicate WorkspaceSubscription row.
    const { stripeCustomerId, created } = await ensureWorkspaceBilling({
      workspaceId: workspace.data!.id,
      stripe,
      client,
      customerEmail: email,
      customerName: name,
    });
    console.log(
      created
        ? `Stripe customer ${stripeCustomerId} + free WorkspaceSubscription created for workspace ${workspace.data!.id}`
        : `Workspace ${workspace.data!.id} already had Stripe customer ${stripeCustomerId}`
    );
  } catch (error) {
    console.error('Error in post-confirmation handler:', error);
    // Don't throw error to prevent user registration from failing
    // Just log the error and continue
  }

  return event;
};
