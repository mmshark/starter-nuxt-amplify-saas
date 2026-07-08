# Agent Patterns — starter-nuxt-amplify-saas

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new

<!-- Append-only. Each entry: 3 sentences max. Link extended docs if needed. -->

## [API Server Routes](api-server.md)
**Context:** All backend logic lives in Nitro `server/api/` routes inside domain layers, secured via Amplify SSR server contexts. **Decision:** Every route must run Amplify calls inside `withAmplifyAuth`/`withAmplifyPublic` (callback receives a contextSpec, not a user), enforce auth with `requireAuth`/`requirePermission`, validate input with readValidatedBody/safeParse so bad input returns 400, and throw `createError` for all errors. **Applies to:** any `layers/*/server/api/**` route; utilities in `layers/amplify/server/utils/amplify.ts`.

---

## [SSR-Safe Composables](composables.md)
**Context:** Composables run on both server and client; module-scope refs or createSharedComposable leak one request's state into another's SSR render, and useState is serialized into the page payload.
**Decision:** Shared serializable state uses `useState` with namespaced keys; `createSharedComposable` only for client-only non-serializable side effects; never write JWTs to state during SSR.
**Applies to:** All composables in layers/*/composables/ and apps/*/app/composables/ — see [composables.md](composables.md).

---

## [Error Handling](error-handling.md)
**Context:** API routes need machine-readable, consistent errors; ad-hoc throws and raw ZodErrors were leaking as opaque 500s.
**Decision:** All server errors go through `createError` with statusCode/statusMessage/message and a `data.code` taxonomy (VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_ERROR); clients parse `error.data` and toast with Nuxt UI `color: 'error'`; taxonomy adoption is pending — only 3 workspace routes emit `data.code` today.
**Applies to:** All Nitro `server/api` routes, server middleware/utils, and composables that call `$fetch`/`useFetch`.

---

## [Git Conventions](git-conventions.md)
**Context:** Commit history must support changelogs, SemVer, and reviewable intent; enforcement is by review only (no commitlint/CI check). **Decision:** Conventional Commits with AGENTS.md project scopes, `<type>/<kebab>` branches, squash-merge PRs, and no AI co-authors. **Applies to:** every commit, branch, and PR in the repo.

---

## [Nuxt Layers](layers.md)
**Context:** Multiple Nuxt apps in a pnpm monorepo need shared auth/billing/workspaces/UI code without duplication or circular dependencies.
**Decision:** All reusable code lives in Nuxt Layers (`layers/*`, published as `@mmshark/<layer>-layer`) with namespaced server routes, glob subpath exports, and peer-first dependencies; apps compose them via `extends` (apps/saas extends the `saas` meta-layer).
**Applies to:** Every new feature or shared module — build it as a layer (or extend one), never copy code between apps.

---

## [Repository Structure & Operations](repository-structure.md)
**Context:** Contributors and agents need one place for context, one command interface, and clear infra boundaries in a pnpm monorepo of Nuxt apps + layers.
**Decision:** AGENTS.md is the context SSOT (all other files are one-line pointers); root package.json scripts are the primary commands with taskfile.yaml as a precondition/composition helper; IaC is Amplify Gen2 colocated in apps/backend/amplify/ plus per-app amplify.yml, with no separate infra tree; docs go in .context/.
**Applies to:** All contributions — repo layout, new layers/apps, commands, infra placement, and documentation location.

---

## [App Config Composition](app-config-composition.md)
**Context:** Layers must ship default configuration that apps can customize without editing layer code, but Nuxt merges app.config files with defu, which concatenates arrays — layer-supplied array defaults would be unremovable.
**Decision:** Layers export menu/array config as typed modules (layers/saas/config/*.ts) and keep only object/primitive defaults in their app.config.ts; apps import and compose those modules in apps/saas/app/app.config.ts; components read exclusively from useAppConfig()/useSaasConfig().
**Applies to:** Every layer and app that defines or consumes app.config configuration.

---

## [Navigation Configuration](navigation-config.md)
**Context:** Navigation menus (sidebar, header, user menu, footer) need layer-provided defaults that apps can extend without duplication.
**Decision:** Three-layer build-time composition — static exports in layers/saas/config/navigation.ts, explicit import+spread in the app's app.config.ts, and runtime components reading only useAppConfig().saas.navigation.
**Applies to:** Any menu change in layers/saas or apps/saas; note two divergent UserMenu.vue shells currently require dual edits (see [tech-debt](../architecture/tech-debt.md)).

---

## Context Directory as Source of Truth
**Context:** Documentation drift made doc/ unreliable — it described capabilities that were never implemented.
**Decision:** .context/ is the single source of truth per org pattern ADR-0010; documents must never claim unimplemented capabilities (see [ADR-003](../architecture/decisions/ADR-003-context-directory-migration.md)).
**Applies to:** This repo — all documentation lives in .context/, and every capability claim must be verified against code before it is written.
