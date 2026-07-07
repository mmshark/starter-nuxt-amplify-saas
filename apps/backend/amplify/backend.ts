import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { postConfirmation } from './auth/post-confirmation/resource';
import { stripeWebhook } from './functions/stripe-webhook/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  postConfirmation,
  stripeWebhook,
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

// Expose the deployed function name so Nitro can target it without the
// operator having to hand-copy it out of the CDK/CloudFormation output.
backend.addOutput({
  custom: {
    stripeWebhookFunctionName: backend.stripeWebhook.resources.lambda.functionName,
  },
});
