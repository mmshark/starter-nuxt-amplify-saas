# 2025-12-02 — Schema cleanup: workspace-based billing migration

> **Status**: Historical · **Created**: 2026-07-08 · **Source**: doc/analysis/schema-cleanup-2025-12-02.md

Removed the deprecated user-level billing model and made workspace-level subscriptions the single source of truth, aligning the data schema with the multi-tenant design. No production data existed, so no migration scripts or rollback were needed.

## What changed

| Change | File |
|---|---|
| Deleted the deprecated `UserSubscription` model and its schema exports/relations | `apps/backend/amplify/data/resource.ts` |
| Kept `UserProfile` (userId + `stripeCustomerId`) and documented it as NOT deprecated — the home for user-level attributes | `apps/backend/amplify/data/resource.ts` |
| Post-confirmation trigger now creates, per new signup: a Personal workspace (`isPersonal: true`), a `WorkspaceMember` with role OWNER, and a `WorkspaceSubscription` on the `free` plan | `apps/backend/amplify/auth/post-confirmation/handler.ts` |
| Seed scripts migrated: `createUserSubscription` → `createWorkspaceSubscription`, seeded users get a personal workspace + OWNER membership | `apps/backend/amplify/seed/seeders/users.ts` |

## Why

The codebase had two competing billing models: user-level (`UserSubscription`) and workspace-level (`WorkspaceSubscription`). Billing API routes already used the workspace model; the schema and signup/seed paths still created the user-level one. This cleanup removed the drift and committed fully to workspace-scoped billing (each workspace has an independent subscription; team billing isolated per tenant).

## Superseded by later work

The 2026-07 remediation reworked much of this area again: the Stripe customer moved from per-user to per-workspace (`ensureWorkspaceBilling` in `layers/billing/server/utils/ensureWorkspaceBilling.ts`, now called from the post-confirmation trigger), and all tenant-table authorization was redesigned. See [2026-07-07-remediation.md](2026-07-07-remediation.md).
