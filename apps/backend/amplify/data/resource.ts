import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../auth/post-confirmation/resource";
import { stripeWebhook } from "../functions/stripe-webhook/resource";
import { workspaceMembership } from "../functions/workspace-membership/resource";

/**
 * TENANT AUTHORIZATION MODEL — group-per-workspace (Cognito groups)
 * ==================================================================
 * Every workspace is guarded by two Cognito user pool groups (see
 * `layers/amplify/server/utils/workspaceGroups.ts`):
 *
 *   ws:<workspaceId>:members  → readers  (all members)
 *   ws:<workspaceId>:admins   → writers  (OWNER + ADMIN)
 *
 * Each tenant record carries the authorizing group names in its
 * `readerGroups`/`writerGroups` fields (set at creation time) and is
 * authorized with dynamic group rules:
 *
 *   allow.groupsDefinedIn('readerGroups').to(['read'])
 *   allow.groupsDefinedIn('writerGroups')            // full CRUD
 *
 * This makes AppSync itself enforce tenant isolation AND role: a signed-in
 * user can only touch rows of workspaces whose Cognito group appears in
 * their token (`cognito:groups` claim), even if they call AppSync directly
 * and bypass the Nitro routes. NO tenant model grants access to
 * `allow.authenticated(...)` in any form.
 *
 * Group lifecycle (create/delete groups, add/remove users) is owned by the
 * `workspace-membership` function (`amplify/functions/workspace-membership/`)
 * and the `post-confirmation` trigger; both hold `allow.resource(...)` grants
 * below because they must write tenant rows before/while the acting user's
 * token contains the new group.
 *
 * NOTE: group changes only take effect on the user's next token refresh.
 */

/**
 * UserProfile - User-level attributes and preferences
 * Purpose: Store user-specific data like Stripe customer ID and future user preferences
 * NOT deprecated - This is the correct place for user-level data
 *
 * Not workspace-scoped: owner-readable only. The only writer is the
 * post-confirmation trigger (schema-level `allow.resource(postConfirmation)`).
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
      readerGroups: a.string().array(),
      writerGroups: a.string().array(),
      members: a.hasMany('WorkspaceMember', 'workspaceId'),
      invitations: a.hasMany('WorkspaceInvitation', 'workspaceId'),
      subscription: a.hasOne('WorkspaceSubscription', 'workspaceId'),
    })
      .authorization((allow) => [
        allow.ownerDefinedIn('ownerId').to(['read']),
        allow.groupsDefinedIn('readerGroups').to(['read']),
        allow.groupsDefinedIn('writerGroups').to(['create', 'update', 'delete', 'read']),
        allow.resource(workspaceMembership), // group + record lifecycle (see function docs)
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
      readerGroups: a.string().array(),
      writerGroups: a.string().array(),
    })
      .authorization((allow) => [
        allow.groupsDefinedIn('readerGroups').to(['read']),
        allow.groupsDefinedIn('writerGroups').to(['create', 'update', 'delete', 'read']),
        allow.resource(stripeWebhook), // Stripe webhook sync (sessionless Lambda, signature-authorized)
        allow.resource(workspaceMembership), // billing bootstrap on workspace create
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
      readerGroups: a.string().array(),
      writerGroups: a.string().array(),
    })
      .authorization((allow) => [
        allow.ownerDefinedIn('userId').to(['read']),
        allow.groupsDefinedIn('readerGroups').to(['read']),
        allow.groupsDefinedIn('writerGroups').to(['create', 'update', 'delete', 'read']),
        allow.resource(workspaceMembership), // membership lifecycle (invite accept, role, remove)
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
      inviterEmail: a.email(),
      token: a.string().required(),
      expiresAt: a.datetime().required(),
      message: a.string(),
      status: a.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED']),
      readerGroups: a.string().array(),
      writerGroups: a.string().array(),
    })
      .authorization((allow) => [
        allow.groupsDefinedIn('readerGroups').to(['read']),
        allow.groupsDefinedIn('writerGroups').to(['create', 'update', 'delete', 'read']),
        allow.resource(workspaceMembership), // accept/decline runs before the invitee has any group
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
