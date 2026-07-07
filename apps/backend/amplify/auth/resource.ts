import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';
import { workspaceMembership } from '../functions/workspace-membership/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 *
 * Cognito ADMIN access grants (group-per-workspace tenancy — see
 * `amplify/data/resource.ts`):
 *  - post-confirmation: creates the `ws:<id>:members`/`ws:<id>:admins`
 *    groups for the new user's personal workspace and adds the user to both.
 *  - workspace-membership: full group lifecycle for user-created workspaces
 *    (create/delete groups, add/remove members on invite accept, role change,
 *    member removal, workspace deletion).
 * These are the ONLY principals with Cognito group-management permissions;
 * the SSR identity-pool roles have none.
 */
export const auth = defineAuth({
  loginWith: {
    email: true
  },
  userAttributes: {
    'profilePicture': {
      mutable: true,
      required: false
    }
  },
  triggers: {
    postConfirmation
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(['createGroup', 'addUserToGroup']),
    allow.resource(workspaceMembership).to([
      'createGroup',
      'deleteGroup',
      'addUserToGroup',
      'removeUserFromGroup'
    ])
  ]
})
