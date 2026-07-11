import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { postConfirmation } from './auth/post-confirmation/resource';
import { stripeWebhook } from './functions/stripe-webhook/resource';
import { workspaceMembership } from './functions/workspace-membership/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  postConfirmation,
  stripeWebhook,
  workspaceMembership,
});

/**
 * Stripe webhook endpoint (Critical 2 fix):
 *
 * `stripe-webhook` is the DIRECT Stripe webhook endpoint. It gets a public
 * Lambda Function URL — the HTTPS URL to register in the Stripe dashboard
 * (exported below as `custom.stripeWebhookUrl`). Authorization is the STRIPE
 * SIGNATURE, verified inside the handler against the raw body with
 * `STRIPE_WEBHOOK_SECRET`; unsigned requests are rejected before anything is
 * parsed or written.
 *
 * Deliberately NO `grantInvoke` to any Cognito identity-pool role: the
 * previous design let the UNAUTHENTICATED (guest) role invoke this function
 * with a forged, unverified payload — anyone with the public
 * amplify_outputs.json could mint guest credentials and rewrite any
 * workspace's subscription.
 */
const stripeWebhookUrl = backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

/**
 * workspace-membership invocation wiring (Critical 1 — group-per-workspace
 * tenancy, see `amplify/functions/workspace-membership/resource.ts`):
 *
 * The Nitro workspace routes invoke this function with the SIGNED-IN user's
 * Cognito Identity Pool AUTHENTICATED role credentials (obtained via
 * `withAmplifyAuth` + `getAwsCredentials` in
 * `layers/amplify/server/utils/amplify.ts`). Only the authenticated role is
 * granted `lambda:InvokeFunction` — never the guest role — and the function
 * independently verifies the caller's access token and re-checks all
 * OWNER/ADMIN business rules, so a direct invoke grants no more power than
 * the routes expose.
 */
backend.workspaceMembership.resources.lambda.grantInvoke(
  backend.auth.resources.authenticatedUserIamRole
);

// The function needs the user pool id for Cognito group-management calls.
// (Amplify also injects AMPLIFY_AUTH_USERPOOL_ID via the auth `access` grant;
// this explicit variable makes the dependency deterministic.)
backend.workspaceMembership.addEnvironment(
  'WORKSPACE_MEMBERSHIP_USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId
);

// Expose deploy-time values Nitro/the operator needs:
//  - stripeWebhookUrl: the public Function URL to register as the webhook
//    endpoint in the Stripe dashboard.
//  - workspaceMembershipFunctionName: the function the workspace routes invoke.
//  - postConfirmationFunctionName: lets the sandbox seeder run the same
//    canonical provisioning path for sandbox users created through Cognito's AdminCreateUser API.
backend.addOutput({
  custom: {
    stripeWebhookUrl: stripeWebhookUrl.url,
    workspaceMembershipFunctionName: backend.workspaceMembership.resources.lambda.functionName,
    postConfirmationFunctionName: backend.postConfirmation.resources.lambda.functionName,
  },
});
