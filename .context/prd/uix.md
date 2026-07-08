# PRD: UIX — UI Foundation & Theming

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/prd/uix.md

## Purpose & scope

The UIX area provides the design-system foundation for all apps in the monorepo: `@nuxt/ui` v4 (MIT) integration, Tailwind CSS v4 design tokens, light/dark theming, and the shared application shell (header, sidebar, layouts). It is implemented across two layers:

- `layers/uix` (`@mmshark/uix-layer`) — module registration, CSS tokens, icon bundling.
- `layers/saas` — the reusable app shell (dashboard/auth/onboarding layouts, `AppHeader`, `AppSidebar`, `UserMenu`) and brand/navigation config.

**In scope**: UI library integration, design tokens, theming, shared layouts/shell, state components, responsive breakpoints, accessibility, icon system.
**Out of scope**: business-logic UI (auth forms, billing UI, workspace UI — owned by their feature layers), application-specific pages, backend integration.

> Note: the source PRD specified **Nuxt UI Pro** and a `tailwind.config.ts`. Both are obsolete: the repo uses the MIT `@nuxt/ui` v4 (`layers/uix/package.json`), and Tailwind v4 defines tokens in CSS via `@theme` (`layers/uix/assets/css/main.css`), not a config file.

## Requirements

Target requirements (condensed from the source PRD, corrected to the current stack). These describe the intended end state, **not** what exists today — see [Current status](#current-status).

### Foundation

| # | Requirement |
|---|---|
| R1 | `@nuxt/ui` v4 (MIT) as the single component library; registered once in `layers/uix/nuxt.config.ts`. |
| R2 | Design tokens (font, brand palette, semantic colors) defined in Tailwind v4 `@theme` blocks in `layers/uix/assets/css/main.css`; apps override via their own `app.config.ts` (`ui.colors.primary` / `ui.colors.neutral`). |
| R3 | Icon system via Iconify with a tree-shaken server bundle (currently `lucide` collections only). |
| R4 | One shared app shell: a single dashboard layout + header/sidebar/user-menu component set consumed by every app. No per-app forks of the shell. |

### Theming

| # | Requirement |
|---|---|
| R5 | Light/dark/system modes via `useColorMode`, SSR-safe with no flash of unstyled content; preference persists across sessions. |
| R6 | Runtime theme customization (primary/neutral color choice) persists across reloads — not an in-memory `appConfig` mutation. |
| R7 | Dark-mode token overrides expressed as CSS variables (e.g. `--ui-bg` override in `main.css`), no runtime recalculation. |

### Shared components & composables

| # | Requirement |
|---|---|
| R8 | Shared state components: `EmptyState`, `LoadingState`, `ErrorState`, `PageHeader` — auto-imported, typed props, standard slots. |
| R9 | Composables: `useTheme()` (wrapper over `useColorMode` with `isDark`/`toggleTheme`/`setTheme`) and `useBreakpoints()` (mobile <768px / tablet / desktop ≥1024px detection). |
| R10 | Responsive shell behavior: full sidebar on desktop, collapsible on tablet, overlay on mobile; touch targets ≥44×44px; no horizontal scrolling. |

### Non-functional

| # | Requirement |
|---|---|
| R11 | Accessibility: WCAG 2.1 AA contrast (≥4.5:1 text), full keyboard navigation, visible focus indicators, ARIA labels on icon-only controls, landmark roles, logical heading hierarchy. |
| R12 | Performance: theme switch <200ms, tree-shaken icons, purged CSS, no layout shift from theming. |
| R13 | Testing: unit tests for tokens/composables; e2e tests for theme switching (toggle, persistence, system preference), responsive layout, and accessibility (axe-core). |
| R14 | Layer README documents only APIs that exist. |

## Current status

Audit 2026-07-08: **Implementation 3/5 · Quality 3/5**. The area leans almost entirely on `@nuxt/ui` v4 + Tailwind v4 with very little own code.

### Implemented

| Item | Evidence |
|---|---|
| `@nuxt/ui` v4 (MIT) registered, lucide icon server bundle | `layers/uix/nuxt.config.ts` |
| Tokens via `@theme`: Public Sans font, custom green palette (`#00DC82` brand green), dark-mode `--ui-bg` override | `layers/uix/assets/css/main.css` |
| Publishable app shell: `dashboard.vue` (hand-built header+sidebar), `auth.vue` (branded card), `onboarding.vue` (query-param progress bar) | `layers/saas/layouts/` |
| Shell components: `AppHeader.vue` (logo, dark-mode toggle with aria-label, hamburger), `AppSidebar.vue`, `UserMenu.vue` | `layers/saas/components/` |
| Brand/navigation/feature config consumed by the shell | `layers/saas/app.config.ts`, `layers/saas/config/navigation.ts` |
| Light/dark preference **does** persist (color-mode storage) | verified by audit |

### Missing / divergent from requirements

| Req | Gap |
|---|---|
| R4 | **Duplicated shell**: `apps/saas` ships its own `UDashboardGroup`-based shell (`apps/saas/app/layouts/default.vue`) alongside the hand-built one in `layers/saas`; two divergent `UserMenu` components (`layers/saas/components/UserMenu.vue` vs `apps/saas/app/components/UserMenu.vue`). |
| R6 | Runtime primary/neutral color selection is an in-memory `appConfig.ui.colors` mutation in `apps/saas/app/components/UserMenu.vue` — lost on reload. (Light/dark persistence works.) |
| R8 | None of the PRD components exist. `layers/uix` has **no** `components/`, `composables/` or `utils/` directories at all — only `nuxt.config.ts` and `assets/css/main.css`. |
| R9 | `useTheme()` and `useBreakpoints()` do not exist. |
| R13 | Zero tests for this area. `apps/saas/tests/e2e/` covers only auth and billing; no theme, responsive, visual-regression or axe-core tests. |
| R14 | `layers/uix/README.md` documents a nonexistent API: Nuxt UI **Pro**, `@nuxt/ui-pro` module, and a `layers/uix/app.config.ts` that does not exist. |
| R2 (nuance) | No app sets `ui.colors.primary`, so the effective primary is Nuxt UI v4's default (`green`) — which `main.css` redefines to Nuxt brand green `#00DC82`. Branding is implicit, not configured. |

## Open issues & risks

- **Shell duplication is the main debt** (R4): every navigation/branding change must be made twice; the `layers/saas` shell is barely exercised by the app despite being published as a package — bit-rot risk. Resolution (pick one shell, delete the other) is scoped in roadmap epic **E03 — template-cleanup**.
- **Documentation drift at the source**: `layers/uix/README.md` sells Nuxt UI Pro and an `app.config.ts` that don't exist, misleading consumers of the published layer. Also covered by E03.
- **Template residue adjacent to the shell**: the polished `apps/saas` pages (Home charts, Customers table, Inbox, NotificationsSlideover) are fed by mock endpoints with hardcoded data (`apps/saas/server/api/`), presenting fake functionality as product. E03 scope.
- **No test safety net** (R13): any shell consolidation or theming change lands untested; e2e/a11y coverage is scoped in roadmap epic **E11 — testing-hardening**.
- **Theme selector half-works** (R6): users can "choose" brand colors that silently reset on reload.

## Related

- [Roadmap](./roadmap.md) — Phase 0 **E03 template-cleanup** (duplicated shell, mock pages, uix README drift); Phase 2 **E11 testing-hardening** (e2e/a11y coverage).
- Layer sources: `layers/uix/` (tokens + module), `layers/saas/` (shell), `apps/saas/app/` (app-local shell to be reconciled).
- Original PRD (historical, contains drift): `doc/prd/uix.md`.
