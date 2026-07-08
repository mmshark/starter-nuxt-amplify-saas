/**
 * Canonical cookie name for the active workspace selection.
 *
 * Single source of truth shared across layers: the client persists the
 * selection under this name (`useWorkspaces`) and the server reads it back
 * (`getWorkspaceContext`). Keeping it here prevents the client/server name
 * drift that made the cookie fallback silently miss (BUG-01).
 */
export const CURRENT_WORKSPACE_COOKIE = 'current-workspace-id'
