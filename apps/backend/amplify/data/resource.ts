import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../auth/post-confirmation/resource";

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
  // userSubscriptions: a.hasMany('UserSubscription', 'planId'), // Removed
  workspaceSubscriptions: a.hasMany('WorkspaceSubscription', 'planId'),
}).identifier(['planId'])

const userSubscriptionModel = a.model({
  userId: a.string().required(),
  planId: a.string(),
  status: a.enum(['active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid']),
  stripeSubscriptionId: a.string(),
  stripeCustomerId: a.string(),
  currentPeriodStart: a.datetime(),
  currentPeriodEnd: a.datetime(),
  cancelAtPeriodEnd: a.boolean().default(false),
  billingInterval: a.enum(['month', 'year']),
  trialStart: a.datetime(),
  trialEnd: a.datetime(),
}).identifier(['userId'])

const schema = a
  .schema({
    UserProfile: userProfileModel
      .authorization((allow) => [
        allow.publicApiKey(),
        allow.ownerDefinedIn("userId").to(["read"]),
      ]),
    SubscriptionPlan: subscriptionPlanModel
      .authorization((allow) => [
        allow.publicApiKey(), // Para mostrar planes en landing page
        allow.authenticated().to(["read"]), // Usuarios autenticados leen
        allow.groups(["admin"]).to(["create", "update", "delete"]), // Solo admins modifican
      ]),
    UserSubscription: userSubscriptionModel
      .authorization((allow) => [
        allow.publicApiKey(), // Para webhooks de Stripe
        allow.ownerDefinedIn("userId").to(["read"]), // Usuario solo lee su propia suscripción
        allow.groups(["admin"]).to(["create", "update", "delete"]), // Admins y webhooks modifican
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
        allow.ownerDefinedIn('ownerId').to(['read', 'update', 'delete']),
        allow.authenticated().to(['create']),
        allow.publicApiKey(), // For server-side privileged access
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
        allow.publicApiKey(), // For Stripe webhooks
        // allow.custom(), // TODO: Implement workspace-based authorization (requires Lambda function)
      ])
      .identifier(['workspaceId'])
      .secondaryIndexes((index) => [
        index('stripeCustomerId'),
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
        allow.publicApiKey(), // For server-side privileged access
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
        allow.ownerDefinedIn('invitedBy').to(['read', 'delete']),
        allow.publicApiKey(), // For server-side privileged access
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
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
