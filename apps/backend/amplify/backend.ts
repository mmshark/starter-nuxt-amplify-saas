import { defineBackend } from '@aws-amplify/backend';
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
 * Stripe webhook auth wiring (Phase 2/3 fix — the Stripe webhook has no
 * Cognito session, so it cannot get IAM creds for `WorkspaceSubscription`
 * writes any other way):
 *
 * Nitro's `layers/billing/server/api/billing/webhook.post.ts` verifies the
 * Stripe signature, then invokes this function using the Cognito Identity
 * Pool UNAUTHENTICATED ("guest") role's credentials (see `withAmplifyPublic`
 * in `layers/amplify/server/utils/amplify.ts`). Grant that role
 * `lambda:InvokeFunction` on this function ONLY — it gets no other
 * permissions, and `stripeWebhook` itself writes `WorkspaceSubscription` /
 * `ProcessedStripeEvent` under its own `allow.resource(stripeWebhook)` grant,
 * not through this IAM role.
 */
backend.stripeWebhook.resources.lambda.grantInvoke(
  backend.auth.resources.unauthenticatedUserIamRole
);

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

// Expose the deployed function names so Nitro can target them without the
// operator having to hand-copy them out of the CDK/CloudFormation output.
backend.addOutput({
  custom: {
    stripeWebhookFunctionName: backend.stripeWebhook.resources.lambda.functionName,
    workspaceMembershipFunctionName: backend.workspaceMembership.resources.lambda.functionName,
  },
});
