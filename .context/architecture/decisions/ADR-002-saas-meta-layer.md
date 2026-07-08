# ADR-002: SaaS meta-layer composes all layers into a publishable dashboard shell

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/saas-layer.md (original decision 2025-12-02)

## Context

The monorepo is built from foundation layers (`amplify`, `uix`, `i18n`) and feature layers
(`auth`, `billing`, `workspaces`, `entitlements`) — see
[../../patterns/layers.md](../../patterns/layers.md). Before this decision, every app had to
manually `extends` 7+ layers in the correct order **and** build its own dashboard layouts,
navigation, and page structure. That meant boilerplate per app, inconsistent UI patterns, and
hours of setup for a new app.

## Decision

Create a single **monolithic meta-layer** `layers/saas` (`@mmshark/saas-layer`, published to
GitHub Packages like the other layers) that:

1. **Extends every foundation and feature layer** — verified in `layers/saas/nuxt.config.ts`:
   `amplify`, `uix`, `i18n`, `auth`, `billing`, `workspaces`, `entitlements`.
2. **Ships a complete application shell** — layouts, pages, and components (inventory below).
3. **Is configured, not forked** — a typed `saas` app-config namespace
   (`layers/saas/types/saas-config.ts`, defaults in `layers/saas/app.config.ts`, accessor in
   `layers/saas/composables/useSaasConfig.ts`, navigation catalogs in
   `layers/saas/config/navigation.ts`). Apps deep-merge overrides in their own `app.config.ts`.
4. **Is overridden by file shadowing** — Nuxt layer precedence resolves app files over
   meta-layer files over feature-layer files, so an app replaces any page/component by creating
   the same path.

An app therefore reduces to one line of composition — `apps/saas/nuxt.config.ts` extends
`@mmshark/saas-layer` (plus the optional `@mmshark/debug-layer`).

**Alternatives rejected** (from the original ADR): a composition-utility layer (fine-grained
opt-in, but still leaves every app to build its own UI) and multiple specialized meta-layers
(3× maintenance, confusing to choose). Rationale: optimize for the 80% case; apps that want
less compose individual layers directly — `apps/landing/nuxt.config.ts` does exactly that
(`uix` + `amplify` only).

## What the layer actually contains (verified 2026-07-08)

| Kind | Files |
|---|---|
| Layouts | `layers/saas/layouts/dashboard.vue`, `auth.vue`, `onboarding.vue` |
| Components | `layers/saas/components/AppHeader.vue`, `AppSidebar.vue`, `UserMenu.vue` |
| Pages | `pages/index.vue`, `pages/auth/{login,signup,forgot-password}.vue`, `pages/profile/*` (index, account, security, notifications), `pages/settings/*` (index, billing, members, workspaces) |
| Config system | `app.config.ts`, `types/saas-config.ts`, `composables/useSaasConfig.ts`, `config/navigation.ts` |

The original ADR also specified `AppShell.vue` and `WorkspaceSwitcherDropdown.vue` components —
these were **never built** (the shell is `AppHeader` + `AppSidebar` inside
`layouts/dashboard.vue`; workspace switching lives in `layers/workspaces`).

## Consequences

**Benefits**

- One-line app composition; new dashboard apps start with working auth, billing, workspace and
  profile flows instead of an empty shell.
- Shell fixes propagate to every consuming app through a version bump of one package.
- Clear customization boundary: config for branding/navigation/feature toggles, file shadowing
  for structural changes.

**Trade-offs**

- All-inclusive by design: consumers pull every feature layer whether used or not; minimal apps
  must fall back to manual composition.
- Opinionated shell; deep divergence means shadowing many files.

**Current status / known debt (verified against the 2026-07-08 audit)**

- **The reference app defeats the layer's purpose today**: `apps/saas` shadows the meta-layer
  shell with its own Nuxt-UI-template shell (`apps/saas/app/layouts/default.vue`,
  `app/pages/index.vue`, `app/components/UserMenu.vue`), so two divergent shells coexist and
  the meta-layer's shell is barely exercised. Roadmap Phase 0 epic **E03** picks one and
  deletes the other ([../../prd/roadmap.md](../../prd/roadmap.md)).
- The `onboarding` layout is used by no page, and the `saas.features.onboarding` flag has no
  readers — onboarding is a future feature (roadmap E15), not a shipped one.
- Some shipped pages contain non-functional forms (`pages/profile/security.vue` password
  change / account deletion, `pages/profile/notifications.vue` preferences) — being defused in
  roadmap E02 and properly built in E07/E14.
- The original ADR's performance benchmarks (FCP < 1.5s, bundle < 300KB) were **targets, never
  measured**; its "future enhancements" (theme variants, multi-brand, plugin system) are not
  built and are not currently on the roadmap.
