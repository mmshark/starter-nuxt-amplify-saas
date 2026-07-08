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
 * `readerGroups` field (set at creation time by Lambda code only) and is
 * authorized with a dynamic group rule:
 *
 *   allow.groupsDefinedIn('readerGroups').to(['read'])   // READ-ONLY
 *
 * CLIENTS ARE READ-ONLY. No tenant model grants create/update/delete to any
 * client principal — not via `groupsDefinedIn`, not via `authenticated(...)`,
 * not via owner rules. EVERY write to a tenant table goes through the
 * privileged functions holding `allow.resource(...)` grants below
 * (`workspace-membership`, `stripe-webhook`, `post-confirmation`), which
 * re-verify the caller's identity and OWNER/ADMIN role themselves. This is
 * what prevents cross-tenant takeover: a signed-in user calling AppSync
 * directly can only READ rows of workspaces whose Cognito group appears in
 * their token (`cognito:groups` claim) and can never set `readerGroups`/
 * `writerGroups`, `role` or `planId`.
 *
 * The `writerGroups` field is retained on the records as metadata (the
 * `ws:<id>:admins` group still drives role semantics inside the Lambdas)
 * but it grants NO AppSync access.
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
        // Clients: READ-ONLY. All writes go through workspace-membership, which
        // is granted data access at SCHEMA scope (see the schema-level
        // `.authorization` below — Amplify does not support per-model function
        // grants).
        allow.ownerDefinedIn('ownerId').to(['read']),
        allow.groupsDefinedIn('readerGroups').to(['read']),
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
        // Clients: READ-ONLY. Only stripe-webhook / workspace-membership /
        // post-confirmation may write subscription rows (incl. planId); those
        // function grants live at SCHEMA scope (see the schema-level
        // `.authorization` below).
        allow.groupsDefinedIn('readerGroups').to(['read']),
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
      // Internal dedupe table: written only by stripe-webhook (schema-scope
      // `allow.resource` grant below). Amplify requires every model to declare
      // at least one authorization rule, so client reads are locked to the
      // static `admin` group — regular users are never in it, so this grants no
      // effective client access. (An empty `.authorization(() => [])` is
      // rejected: "Model `ProcessedStripeEvent` is missing authorization rules".)
      .authorization((allow) => [allow.groups(['admin']).to(['read'])]),

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
        // Clients: READ-ONLY. Membership rows (incl. `role`) are written only
        // by workspace-membership / post-confirmation, granted at SCHEMA scope
        // (see the schema-level `.authorization` below).
        allow.ownerDefinedIn('userId').to(['read']),
        allow.groupsDefinedIn('readerGroups').to(['read']),
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
        // Clients: READ-ONLY (workspace members can list invitations).
        // Invitations are CREATED only by workspace-membership, which derives
        // readerGroups/writerGroups from the workspace id — never from client
        // input — and re-verifies the inviter's OWNER/ADMIN role. That function
        // grant lives at SCHEMA scope (see the schema-level `.authorization`).
        allow.groupsDefinedIn('readerGroups').to(['read']),
      ])
      .secondaryIndexes((index) => [
        index('workspaceId'),
        index('email'),
      ]),
  })
  // Function data access is configured ONLY at schema scope — Amplify does not
  // support per-model function grants (docs: "Function access ... cannot be
  // configured on individual models or fields"). Each of these Lambdas is
  // trusted privileged code that re-verifies the caller's identity/role in its
  // own handler; client-facing tenant isolation is enforced by the per-model
  // group rules above, which are unchanged. This grants each function
  // Query/Mutation/Subscription over the API (BUG-16: replaces the unsupported
  // model-scope `allow.resource(...)` grants that no longer type-check).
  .authorization((allow) => [
    allow.resource(postConfirmation),    // user bootstrap: UserProfile, personal workspace, owner membership, free subscription
    allow.resource(workspaceMembership), // workspace / member / invitation / subscription lifecycle
    allow.resource(stripeWebhook),       // WorkspaceSubscription + ProcessedStripeEvent sync
  ]);

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
