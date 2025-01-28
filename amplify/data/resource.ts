import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { planModel } from './models/plan';

const schema = a.schema({
  Plan: planModel
    .authorization((allow) => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'iam',
  },
});