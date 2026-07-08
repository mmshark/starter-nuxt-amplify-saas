import { defineFunction, secret } from '@aws-amplify/backend'

/**
 * workspace-membership
 *
 * Owns the OPERATIONAL core of the group-per-workspace tenancy model
 * (`ws:<workspaceId>:members` / `ws:<workspaceId>:admins` Cognito groups —
 * see `layers/amplify/server/utils/workspaceGroups.ts`):
 *
 *  - workspace create:  create both Cognito groups, add the owner to both,
 *    create the Workspace/WorkspaceMember records and bootstrap billing
 *  - invitation accept/decline: validate the invitation against the CALLER's
 *    verified identity, create the member record, add the user to the groups
 *  - role change:       add/remove the target user in `ws:<id>:admins`
 *  - member remove / workspace delete: remove users from / delete the groups
 *
 * These live here (not in the Nitro routes) because:
 *  1. Cognito admin APIs (`CreateGroup`, `AdminAddUserToGroup`, ...) require
 *     IAM permissions the SSR identity-pool roles do not (and must not) have.
 *     This function is granted exactly those actions via `defineAuth`'s
 *     `access` callback in `amplify/auth/resource.ts`.
 *  2. The acting user's access token does not yet contain the new group
 *     (Cognito only embeds groups at token issue time), so the dynamic-group
 *     AppSync rules cannot authorize the very writes that establish
 *     membership. This function holds `allow.resource(workspaceMembership)`
 *     on the tenant models instead (see `amplify/data/resource.ts`).
 *
 * SECURITY MODEL: the function is only invokable by the Cognito Identity
 * Pool AUTHENTICATED role (granted in `backend.ts` — never the guest role),
 * and it does NOT trust its payload: every invocation carries the caller's
 * Cognito access token, which the handler verifies with `GetUser` (the token
 * itself is the credential; no extra IAM permission needed) and derives the
 * caller's userId/email from. All OWNER/ADMIN business checks are re-done
 * here against the database, so invoking this function directly grants no
 * more power than the Nitro routes expose.
 */
export const workspaceMembership = defineFunction({
  name: 'workspace-membership',
  // Lives in the auth stack: it needs the user pool id + Cognito access
  // grants, and being grouped with auth avoids a circular dependency between
  // the auth and function stacks.
  resourceGroupName: 'auth',
  timeoutSeconds: 30,
  environment: {
    // Workspace creation bootstraps the workspace's Stripe customer + free
    // subscription (same flow as the post-confirmation trigger).
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
  },
})
