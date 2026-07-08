import { defineFunction, secret } from '@aws-amplify/backend'

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  // Lives in the auth stack: it is an auth trigger AND is granted Cognito
  // group-management actions in `auth/resource.ts` (`access` callback);
  // grouping it with auth avoids a circular dependency between stacks.
  resourceGroupName: 'auth',
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY')
  }
})
