import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../auth/post-confirmation/resource";
import { stripeWebhook } from "../functions/stripe-webhook/resource";

/**
 * UserProfile - User-level attributes and preferences
 * Purpose: Store user-specific data like Stripe customer ID and future user preferences
 * NOT deprecated - This is the correct place for user-level data
 */
const userProfileModel = a.model({
  userId: a.string().required(),
  stripeCustomerId: a.string(),
}).identifier(['userId'])

const subscriptionPlanModel = a.model({
  planId: a.string().required(),
  name: a.string().required(),
  description: a.string(),
  monthlyPrice: a.float().required(),
  yearlyPrice: a.float().required(),
  priceCurrency: a.string().required().default('USD'),
  stripeMonthlyPriceId: a.string(),
  stripeYearlyPriceId: a.string(),
  stripeProductId: a.string().required(),
  isActive: a.boolean().required().default(true),
  workspaceSubscriptions: a.hasMany('WorkspaceSubscription', 'planId'),
}).identifier(['planId'])

const schema = a
  .schema({
    UserProfile: userProfileModel
      .authorization((allow) => [
        allow.ownerDefinedIn("userId").to(["read"]),
        allow.authenticated('identityPool').to(["read", "create", "update"]), // server (IAM) privileged
      ]),
    SubscriptionPlan: subscriptionPlanModel
      .authorization((allow) => [
        allow.publicApiKey().to(["read"]), // landing page, read-only
        allow.authenticated().to(["read"]), // Usuarios autenticados leen
        allow.groups(["admin"]).to(["create", "update", "delete"]), // Solo admins modifican
      ]),

    // Workspaces
    Workspace: a.model({
      name: a.string().required(),
      slug: a.string().required(),
      description: a.string(),
      ownerId: a.string().required(),
      isPersonal: a.boolean().default(false),
      memberCount: a.integer().default(1),
      members: a.hasMany('WorkspaceMember', 'workspaceId'),
      invitations: a.hasMany('WorkspaceInvitation', 'workspaceId'),
      subscription: a.hasOne('WorkspaceSubscription', 'workspaceId'),
    })
      .authorization((allow) => [
        allow.ownerDefinedIn('ownerId').to(['read']),
        allow.authenticated('identityPool'), // full CRUD for server (IAM) only
      ])
      .secondaryIndexes((index) => [
        index('slug'),
        index('ownerId'),
      ]),

    WorkspaceSubscription: a.model({
      workspaceId: a.id().required(),
      workspace: a.belongsTo('Workspace', 'workspaceId'),
      planId: a.string().required(),
      plan: a.belongsTo('SubscriptionPlan', 'planId'),

      stripeSubscriptionId: a.string(),
      stripeCustomerId: a.string().required(),

      status: a.enum(['active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid']),
      currentPeriodStart: a.datetime().required(),
      currentPeriodEnd: a.datetime(),
      cancelAtPeriodEnd: a.boolean().default(false),
      billingInterval: a.enum(['month', 'year']),
      trialStart: a.datetime(),
      trialEnd: a.datetime(),
    })
      .authorization((allow) => [
        allow.authenticated('identityPool'), // server writes via IAM (checkout, portal, etc.)
        allow.resource(stripeWebhook), // Stripe webhook sync (sessionless Lambda, no user auth)
      ])
      .identifier(['workspaceId'])
      .secondaryIndexes((index) => [
        index('stripeCustomerId'),
      ]),

    // Dedupe table for Stripe webhook delivery: guards against reprocessing a
    // redelivered/retried event (Task 3.3 step 3).
    ProcessedStripeEvent: a.model({
      eventId: a.string().required(),
      type: a.string(),
      processedAt: a.datetime().required(),
    })
      .identifier(['eventId'])
      .authorization((allow) => [
        allow.resource(stripeWebhook),
      ]),

    WorkspaceMember: a.model({
      workspaceId: a.id().required(),
      workspace: a.belongsTo('Workspace', 'workspaceId'),
      userId: a.string().required(),
      email: a.email().required(),
      name: a.string(),
      role: a.enum(['OWNER', 'ADMIN', 'MEMBER']),
      joinedAt: a.datetime().required(),
    })
      .authorization((allow) => [
        allow.ownerDefinedIn('userId').to(['read']),
        allow.authenticated('identityPool'), // server (IAM) privileged access
      ])
      .secondaryIndexes((index) => [
        index('workspaceId'),
        index('userId'),
      ]),

    WorkspaceInvitation: a.model({
      workspaceId: a.id().required(),
      workspace: a.belongsTo('Workspace', 'workspaceId'),
      email: a.email().required(),
      role: a.enum(['OWNER', 'ADMIN', 'MEMBER']),
      invitedBy: a.string().required(),
      inviterName: a.string(),
      token: a.string().required(),
      expiresAt: a.datetime().required(),
      message: a.string(),
    })
      .authorization((allow) => [
        allow.authenticated('identityPool'), // never client-readable; server routes only
      ])
      .secondaryIndexes((index) => [
        index('workspaceId'),
        index('email'),
      ]),
  })
  .authorization((allow) => [allow.resource(postConfirmation)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 365, // read-only public plans only
    },
  },
});
