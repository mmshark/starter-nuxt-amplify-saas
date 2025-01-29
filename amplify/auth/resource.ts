import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true
  },
  multifactor: {
    mode: 'OPTIONAL',
    totp: true
  },
  userAttributes: {
    givenName: {
      required: true,
      mutable: true
    },
    familyName: {
      required: true,
      mutable: true
    },
    preferredUsername: {
      required: true,
      mutable: true
    }
  }
});
