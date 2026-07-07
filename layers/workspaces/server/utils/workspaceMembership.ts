/**
 * The workspace-membership invoke helper now lives in the amplify layer
 * (`layers/amplify/server/utils/workspaceMembership.ts`) so the billing
 * layer can share it without a dependency cycle. Re-exported here to keep
 * the workspaces routes' relative imports working.
 */
export {
  getSessionAccessToken,
  invokeWorkspaceMembership,
  readInvitationToken
} from '@mmshark/amplify-layer/server/utils/workspaceMembership'
