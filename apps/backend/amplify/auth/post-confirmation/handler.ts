import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { randomUUID } from "node:crypto";
import type { Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from "$amplify/env/post-confirmation";
import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import Stripe from 'stripe';
import { ensureWorkspaceBilling } from '@mmshark/billing-layer/server/utils/ensureWorkspaceBilling';
import {
  workspaceReaderGroup,
  workspaceWriterGroup,
  workspaceGroupFields,
} from '@mmshark/amplify-layer/server/utils/workspaceGroups';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const cognito = new CognitoIdentityProviderClient();

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil'
});

async function createGroupIdempotent(userPoolId: string, groupName: string, description: string): Promise<void> {
  try {
    await cognito.send(new CreateGroupCommand({
      UserPoolId: userPoolId,
      GroupName: groupName,
      Description: description,
    }));
  } catch (error) {
    // Tolerate retried trigger invocations that already created the group.
    if (!(error instanceof Error && error.name === 'GroupExistsException')) throw error;
  }
}

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

    // Group-per-workspace tenancy: pre-generate the workspace id so the
    // Cognito groups and the records' readerGroups/writerGroups fields can
    // all be derived from it up front (see amplify/data/resource.ts).
    const workspaceId = randomUUID();
    const groupFields = workspaceGroupFields(workspaceId);

    await createGroupIdempotent(
      event.userPoolId,
      workspaceReaderGroup(workspaceId),
      `Members of workspace ${workspaceId}`
    );
    await createGroupIdempotent(
      event.userPoolId,
      workspaceWriterGroup(workspaceId),
      `Admins of workspace ${workspaceId}`
    );

    // The owner belongs to both the reader and the writer group. This runs
    // BEFORE the user's first sign-in, so their very first tokens already
    // carry the personal workspace's groups.
    for (const groupName of [workspaceReaderGroup(workspaceId), workspaceWriterGroup(workspaceId)]) {
      await cognito.send(new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: groupName,
      }));
    }
    console.log(`Workspace groups created for workspace ${workspaceId}, user ${userId} added`);

    // Create Personal workspace for new user
    const workspace = await client.models.Workspace.create({
      id: workspaceId,
      name: 'Personal',
      slug: `${userId}-personal`,
      description: 'Personal workspace',
      ownerId: userId,
      isPersonal: true,
      memberCount: 1,
      ...groupFields,
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
      ...groupFields,
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
