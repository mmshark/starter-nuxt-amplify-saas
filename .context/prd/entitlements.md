# PRD: Entitlements — Authorization, RBAC & Feature Gating

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/entitlements.md

## Purpose & scope

The entitlements layer (`layers/entitlements/`) controls what an authenticated user can do,
bridging auth (who you are), workspaces (your role in the current tenant) and billing (the
workspace's subscription plan). Two axes:

- **Plan-based feature entitlements** — feature access derived from the workspace subscription tier.
- **Role-based permissions (RBAC)** — action access derived from the workspace membership role.

**In scope**: feature/permission catalogs, universal (SSR-safe) checking composable, gating
components, route middlewares, server-side enforcement utilities, entitlements read API.

**Out of scope**: authentication (auth layer), subscription management (billing layer), workspace
membership CRUD (workspaces layer), usage metering/quotas, and **runtime feature flags** —
flags independent of plans (targeting, rollout, A/B) are a separate future capability (roadmap E22),
not part of this layer today.

## Requirements

### Authorization model

| Axis | Source of truth | Values |
|---|---|---|
| Plan | `WorkspaceSubscription.planId` (billing layer, per workspace) | `free` → `starter` → `pro` → `enterprise` (hierarchical) |
| Role | `WorkspaceMember.role` (workspaces layer), mapped `OWNER→owner`, `ADMIN→admin`, else `user` | `user` → `admin` → `owner` (hierarchical) |

No persistent models of its own; entitlements are derived state. Catalogs are the single source of
truth, defined in code with plan/role inheritance:

- `layers/entitlements/config/features.ts` — 10 features (`basic-dashboard`, `advanced-analytics`, `audit-logs`, `data-export`, `webhooks`, `api-access`, `priority-support`, `custom-branding`, `sso`, `custom-integrations`) mapped to plans via `PLAN_FEATURES`.
- `layers/entitlements/config/permissions.ts` — 9 permissions (`view-dashboard`, `manage-profile`, `view-billing`, `view-analytics`, `access-api`, `manage-users`, `manage-settings`, `manage-billing`, `export-data`) mapped to roles via `ROLE_PERMISSIONS`.
- Types in `layers/entitlements/types/entitlements.ts` (`Plan`, `Role`, `Feature`, `Permission`, definitions/mappings).

### Functional requirements

| # | Requirement |
|---|---|
| F1 | Users access only features included in their workspace's plan; UI gates render fallback/upgrade prompts for locked features. |
| F2 | Actions are gated by role permission; unauthorized users get clear feedback, never a silent failure or protected content flash (SSR-correct). |
| F3 | Denied plan-gated access offers a one-click path to the upgrade/billing flow, stating current vs required plan. |
| F4 | Route-level protection via middlewares reading `definePageMeta` (`feature`, `permission`, `requiredPlan`); unauthenticated users are sent to `/auth/login` with a redirect query. |
| F5 | Server-side enforcement is authoritative: every sensitive API route validates permission/feature/plan server-side; client checks are UX only. |
| F6 | Server checks verify actual workspace membership against `WorkspaceMember` — client-supplied workspace ids/cookies grant nothing on their own — and fail closed to `free`/`user`. |
| F7 | Entitlements state updates after subscription changes (plan upgrade reflects without re-login). |

### Client API

| Artifact | Location | Contract |
|---|---|---|
| `useEntitlements()` | `layers/entitlements/composables/useEntitlements.ts` | State: `subscriptionPlan`, `userRole`, `availableFeatures`, `grantedPermissions`, `isAuthenticated`. Methods: `canAccessFeature`, `hasPermission`, `hasRole`, `hasPlan`, `getRequiredPlanForFeature`. SSR-safe; deliberately not `createSharedComposable` (would leak state across pooled server requests). |
| `<FeatureGate>` | `layers/entitlements/components/FeatureGate.vue` | Renders default slot if feature accessible, fallback slot otherwise. |
| `<PermissionGuard>` | `layers/entitlements/components/PermissionGuard.vue` | Single permission or array with `requireAll`. |
| `<UpgradePrompt>` | `layers/entitlements/components/UpgradePrompt.vue` | Shows required plan, navigates to the billing/upgrade flow. |
| `feature` / `permission` / `requirePlan` middlewares | `layers/entitlements/middleware/` | Read route meta, redirect on denial. |

### Server API

| Artifact | Location | Contract |
|---|---|---|
| `getWorkspaceContext(event, workspaceId?)` | `layers/entitlements/server/utils/getWorkspaceContext.ts` | Authenticates via Amplify SSR session, verifies membership, resolves `{plan, role, workspace, membership}`; callers acting on a caller-supplied `workspaceId` must pass it explicitly. |
| `requirePermission` / `requireFeature` / `requirePlan` | `layers/entitlements/server/utils/` | Throw 403 (with required plan/role detail) on denial. |
| `withPermission` / `withFeature` | `layers/entitlements/server/utils/` | HOF wrappers for protected handlers. |
| `GET /api/entitlements` | `layers/entitlements/server/api/entitlements/index.get.ts` | Current plan, role, features, permissions. |
| `GET /api/entitlements/check-feature` | `.../check-feature.get.ts` | Check one feature. |
| `GET /api/entitlements/check-permission` | `.../check-permission.get.ts` | Check one permission. |
| `GET /api/entitlements/features` | `.../features.get.ts` | Full catalog with access status. |

Dropped from the original PRD (never built, no longer targeted): `definePermissions()` /
`defineFeatures()` helper utilities — the static catalogs cover the need.

## Current status

Audit 2026-07-08 verdict: **the layer itself is complete and well built, but nothing in the product
consumes its UI surface, and the client-side plan resolution is broken end-to-end.** Impl 3/5,
quality 3/5.

| Capability | Status | Evidence |
|---|---|---|
| Catalogs, types, composable, components, middlewares, server utils, 4 API endpoints | Implemented | All files listed above exist under `layers/entitlements/` |
| Server-side enforcement where consumed | Implemented | `requirePermission('manage-billing')` guards `layers/billing/server/api/billing/checkout.post.ts` and `portal.post.ts` (explicit `workspaceId` path); membership verified against `WorkspaceMember`; fails closed to `free`/`user` |
| UI gating consumed by the app (F1–F4) | **Missing** | No page/component in `apps/saas/` or `layers/saas/` uses `FeatureGate`, `PermissionGuard`, `UpgradePrompt` or the `feature`/`permission`/`requirePlan` middlewares — the entire client gating surface has zero consumers |
| Client/SSR plan resolution (F1, F7) | Implemented | `useWorkspaces` hydrates each workspace subscription and `useEntitlements().subscriptionPlan` derives the active workspace plan |
| Middleware/prompt redirect targets (F3) | Implemented stopgap | Denials target real routes (`/settings/billing` for upgrades, `/` for permissions); E06 will use `/settings/billing/plans` consistently while adopting the gates |
| Cookie-based server plan/role resolution (F6 path) | Implemented | Client and server share the `current-workspace-id` cookie contract; callers may also pass an explicit workspace ID |
| Role-gated UI in product | Partial, **outside the layer** | Ad-hoc checks via `useWorkspaceMembership().isAdminOrOwner` in `layers/saas/pages/settings/index.vue:7` and `layers/saas/pages/settings/workspaces.vue:47` instead of `hasPermission`/`PermissionGuard` |
| Feature flags (runtime, targeting, A/B) | **Missing** | No flag model, no provider integration, no admin UI anywhere in the repo; the `enabled` field on `FEATURES` entries is dead code — nothing reads it, so `enabled: false` would not block anything |
| Tests | Minimal | One unit test: `layers/entitlements/server/utils/__tests__/requirePermission.test.ts` (covers the authorization guard billing depends on). No entitlements e2e specs in `apps/saas/tests/e2e/` |

## Open issues & risks

1. **Narrow enforcement coverage**: only billing routes currently use the entitlements server guards;
   other sensitive routes
   rely on their own layer-level auth, not on entitlements permissions.
2. **Misleading `enabled` catalog field**: reads as a kill switch but is never consulted; wire it or
   remove it (E06).
3. **Divergent ad-hoc role gating** in settings pages will drift from the catalog; replace with
   layer primitives when wiring (E06).
4. **Entitlements already sold, not delivered**: `audit-logs` and `priority-support` appear in paid
   plan catalogs but have no backing product capability (roadmap E12, E20).

## Related

- [Roadmap](../prd/roadmap.md) — completed E02/E05 fixed hydration and the real plans destination;
  E27 projects the catalog and E06 consumes the layer primitives,
  E12 *security-hardening* (audit-log MVP), E20 *support-feedback* (priority support),
  E22 *feature-flags* (runtime flags).
- Sibling PRDs: [billing](../prd/billing.md) (subscription source of truth, checkout/portal guards),
  [workspaces](../prd/workspaces.md) (membership roles, current-workspace state),
  [auth](../prd/auth.md) (session the server guards authenticate against).
- Layer reference: `layers/entitlements/README.md` (usage examples; honestly marks feature flags as
  a planned future enhancement).
