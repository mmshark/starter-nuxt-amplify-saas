# PRD: SaaS Meta-Layer (`@mmshark/saas-layer`)

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/saas-layer.md

## Purpose & scope

`layers/saas` is the aggregation layer: it composes every feature layer (auth, billing,
workspaces, entitlements) plus the foundations (amplify, uix, i18n) and adds the application
shell — layouts, pages, navigation config — so an app gets a working SaaS dashboard by
extending a single layer. Apps that find the meta-layer too opinionated can compose the
underlying layers directly.

**In scope**: layer composition, dashboard/auth shell, auth pages, workspace-settings and
user-profile pages, navigation configuration, app.config-driven customization (brand, feature
toggles, theme), dark mode, responsive layout, onboarding flow (target — see Current status).

**Out of scope**: business-specific features, domain components (they live in their feature
layers), multi-brand white-labeling, advanced theming beyond Nuxt UI colors.

## Requirements

### R1 — Layer composition

`layers/saas/nuxt.config.ts` extends, in order: `@mmshark/amplify-layer`, `@mmshark/uix-layer`,
`@mmshark/i18n-layer` (foundations), then `@mmshark/auth-layer`, `@mmshark/billing-layer`,
`@mmshark/workspaces-layer`, `@mmshark/entitlements-layer` (features). Apps extend
`@mmshark/saas-layer` only (see `apps/saas/nuxt.config.ts`). No circular dependencies.

### R2 — Application shell and layouts

| Layout | File | Purpose |
|---|---|---|
| `dashboard` | `layers/saas/layouts/dashboard.vue` | Authenticated pages: header + sidebar + content, responsive (persistent sidebar ≥1024px, hamburger <768px) |
| `auth` | `layers/saas/layouts/auth.vue` | Centered card with configurable branding, guest-only |
| `onboarding` | `layers/saas/layouts/onboarding.vue` | First-run wizard shell: progress bar, skip link |

Shell components: `layers/saas/components/AppHeader.vue` (logo, workspace switcher, dark-mode
toggle, user menu), `AppSidebar.vue`, `UserMenu.vue`. Only generic shell components belong
here; domain components live in their feature layer (`WorkspaceGeneralForm` → workspaces,
`UserProfileSettings` → auth). **There must be exactly one dashboard shell** — apps customize
it via config/overrides, not by maintaining a parallel one.

### R3 — Pages

Actual route structure (supersedes the source PRD's obsolete `/billing`, `/workspace`,
`/settings/profile` tree):

| Route | File | Scope |
|---|---|---|
| `/` | `layers/saas/pages/index.vue` | Dashboard home: welcome, plan/members/workspace stats, quick actions |
| `/auth/login`, `/auth/signup` | `layers/saas/pages/auth/` | Sign in / sign up (Authenticator from auth layer) |
| `/auth/forgot-password` | `layers/saas/pages/auth/forgot-password.vue` | Two-step reset (request code + confirm) |
| `/settings` | `layers/saas/pages/settings/index.vue` | Workspace general settings (owner/admin) |
| `/settings/members` | `layers/saas/pages/settings/members.vue` | Team members and invitations |
| `/settings/billing` | `layers/saas/pages/settings/billing.vue` | Workspace subscription and invoices |
| `/settings/workspaces` | `layers/saas/pages/settings/workspaces.vue` | Workspace list / switcher |
| `/profile` | `layers/saas/pages/profile/index.vue` | User name/avatar |
| `/profile/account` | `layers/saas/pages/profile/account.vue` | Email, password, delete account |
| `/profile/security` | `layers/saas/pages/profile/security.vue` | Password change, sessions |
| `/profile/notifications` | `layers/saas/pages/profile/notifications.vue` | Notification preferences |

**Scoping rule**: `/settings/*` is workspace-scoped (affects the team, needs workspace context
and role checks); `/profile/*` is user-scoped (works across workspaces, auth only). Both use
the parent-layout pattern: `settings.vue` / `profile.vue` render a `UDashboardToolbar` +
`UNavigationMenu` fed from `layers/saas/config/navigation.ts` (`settingsSidebar`,
`profileSidebar`), children render inside `<NuxtPage>` wrapped in `UPageCard`.

### R4 — Configuration

- `layers/saas/app.config.ts` provides defaults under the `saas` key: `brand` (name, logo,
  description, favicon), `features` (multiWorkspace, workspaceSwitcher, onboarding, darkMode),
  `layouts` (sidebar behavior, auth branding/footer), `theme.colors`. Typed by
  `layers/saas/types/saas-config.ts`, accessed via `useSaasConfig()`
  (`layers/saas/composables/useSaasConfig.ts`).
- Navigation is composed at build time: apps import the exported menu trees from
  `layers/saas/config/navigation.ts` into their own `app.config.ts` (see
  [patterns/navigation-config.md](../patterns/navigation-config.md)).
- Every feature toggle in the schema must have a reader; flags nothing consumes must be
  removed or wired (see Current status).
- Standard Nuxt layer precedence applies for overrides: app files > saas layer > feature
  layers. Apps may override any page/component/layout by shadowing its path.

### R5 — Onboarding flow (target, not implemented)

First-run wizard at `/onboarding`: multi-step, config-driven, progress persistence on
`UserProfile`, skip option, and middleware redirecting users with incomplete onboarding.
Scoped in the roadmap as epic E15; requires a write path on `UserProfile` (today it is
read-only for the user — only the post-confirmation Lambda writes it).

### R6 — Quality bars (targets)

- E2E coverage of the shell: navigation, auth pages, responsive behavior, dark mode.
- WCAG 2.1 AA; keyboard navigation; Lighthouse mobile > 90; FCP < 1.5s.
- No hardcoded UI strings — labels through the i18n layer.
- No external runtime dependencies for avatars/images (no ui-avatars.com etc.).

## Current status

Audit-verified snapshot (2026-07-08). Ratings from the feature audit: UI kit/shell 3/5 impl ·
3/5 quality; onboarding 2/5 · 2/5.

| Requirement | Status | Evidence |
|---|---|---|
| R1 layer composition | **Implemented** | `layers/saas/nuxt.config.ts` extends all 7 layers; `apps/saas` extends the meta-layer |
| R2 auth layout | **Implemented, in use** | `layers/saas/layouts/auth.vue` used by all `pages/auth/*` |
| R2 dashboard shell | **Implemented but shadowed — two divergent shells** | Layer shell (`dashboard.vue`, `AppHeader`, `AppSidebar`, `UserMenu`) is only consumed by `layers/saas/pages/index.vue`, which `apps/saas/app/pages/index.vue` shadows; the reference app actually runs its own `apps/saas/app/layouts/default.vue` (`UDashboardGroup`) with a second, divergent `apps/saas/app/components/UserMenu.vue` |
| R2 single-shell rule | **Violated** | Duplication above; navigation/branding changes must be made twice; the layer shell is barely exercised (bit-rot risk) despite being the published package |
| R3 settings pages | **Implemented, in use** | `/settings` general/members/billing/workspaces render through the layer's parent-layout pattern; ad-hoc `isAdminOrOwner` role checks in `layers/saas/pages/settings/index.vue` |
| R3 profile pages | **Partially implemented** | Navigation + name/surname editing work; `/profile/security` is a dead form (no submit handler, no `updatePassword` anywhere), delete-account button has no handler, `/profile/notifications` discards changes (template stub) |
| R3 dashboard home | **Implemented but shadowed** | `layers/saas/pages/index.vue` (welcome + quick actions) is overridden in the reference app by the Nuxt UI template demo home (mock charts/stats) |
| R4 config schema | **Partially implemented** | Schema, types and `useSaasConfig()` exist; `workspaceSwitcher`/`darkMode` are read in `AppHeader.vue` (itself shadowed); `features.onboarding`, `features.multiWorkspace` and `theme.colors` have **zero readers** (dead config) |
| R5 onboarding | **Not implemented** | No `/onboarding` route, wizard, `useOnboarding()`, persistence fields, or redirect middleware. `layers/saas/layouts/onboarding.vue` is orphaned (grep: zero uses of `layout: 'onboarding'`). The source PRD's "✅ Onboarding flow" claim was false — the only real post-signup behavior is the provisioning Lambda (`apps/backend/amplify/auth/post-confirmation/handler.ts`) |
| R6 shell tests | **Not implemented** | E2E suites cover only auth and billing (`apps/saas/tests/e2e/specs/layers/{auth,billing}`); no navigation/responsive/dark-mode/visual-regression specs |
| R6 i18n | **Not implemented** | All labels hardcoded English, incl. `layers/saas/config/navigation.ts`; zero `$t()`/`useI18n()` usage repo-wide |
| R6 no external images | **Violated** | ui-avatars.com in `layers/saas/pages/settings/workspaces.vue` (lines 27, 83) and `apps/saas/app/components/UserMenu.vue` (line 24) |

Dropped from the source PRD as obsolete: the `pages/billing/`, `pages/workspace/`,
`pages/settings/{profile,account,security}` tree (restructured into `/settings` + `/profile`),
the `AppShell.vue` and `WorkspaceSwitcherDropdown.vue` components (never built; the switcher
is `WorkspaceSwitcher.vue` in `layers/workspaces`), runtime navigation via `app.config`
(replaced by build-time composition), and the "✅" claims for e2e/visual test coverage.

## Open issues & risks

- **Duplicated shell** (main debt): hand-made shell in `layers/saas` vs `UDashboardGroup`
  shell in `apps/saas`, with two divergent `UserMenu` components. Every change is double
  work and the published layer shell is untested in practice. Roadmap epic E03
  (template-cleanup) resolves this: pick one shell, delete the other.
- **Dead code/config that misleads adopters**: orphaned `onboarding.vue` layout, unread
  `features.onboarding` / `features.multiWorkspace` / `theme.colors` config, and
  `layers/saas/README.md` (line 109) still documenting the onboarding layout as
  "First-time user setup layout".
- **Ghost forms in profile pages**: password change and account deletion render but do
  nothing — a user can believe they changed their password. Phase 0 (E02) disables the lying
  surfaces; E07 builds the real feature.
- **Template residue presented as product**: the reference app's home/customers/inbox pages
  are mock-fed Nuxt UI demo pages that shadow the layer's real dashboard home (E03).
- **External avatar dependency**: ui-avatars.com calls leak workspace/user names to a third
  party and break under strict CSP (E03/E08).
- **Theme config is decorative**: `saas.theme.colors` (blue/slate) has no reader; the
  effective primary is the uix layer's green palette override.

## Related

- [Roadmap](./roadmap.md) — Phase 0 E02 (fix-broken-wiring), E03 (template-cleanup: single
  shell, mock removal); Phase 1 E06 (entitlements-wiring), E07 (account-management); Phase 2
  E13 (i18n-adoption), E15 (onboarding).
- Sibling PRDs: [uix.md](./uix.md) (design system under the shell), [i18n.md](./i18n.md).
- Patterns: [navigation-config.md](../patterns/navigation-config.md),
  [repository-structure.md](../patterns/repository-structure.md),
  [api-server.md](../patterns/api-server.md).
- Key source files: `layers/saas/nuxt.config.ts`, `layers/saas/app.config.ts`,
  `layers/saas/config/navigation.ts`, `layers/saas/types/saas-config.ts`.
