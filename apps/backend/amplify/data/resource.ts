import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../auth/post-confirmation/resource";

const userProfileModel = a.model({
  userId: a.string().required(),
  stripeCustomerId: a.string(),
  subscription: a.hasOne('UserSubscription', 'userId'),
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
  userSubscriptions: a.hasMany('UserSubscription', 'planId'),
}).identifier(['planId'])

const userSubscriptionModel = a.model({
  userId: a.string().required(),
  planId: a.string().required(),

  stripeSubscriptionId: a.string(),

  stripeCustomerId: a.string().required(),
  status: a.enum(['active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid']),
  currentPeriodStart: a.datetime().required(),
  currentPeriodEnd: a.datetime(), // Optional - null for free plans that never expire
  cancelAtPeriodEnd: a.boolean().default(false),
  billingInterval: a.enum(['month', 'year']),
  trialStart: a.datetime(),
  trialEnd: a.datetime(),

  userProfile: a.belongsTo('UserProfile', 'userId'),
  subscriptionPlan: a.belongsTo('SubscriptionPlan', 'planId'),
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
