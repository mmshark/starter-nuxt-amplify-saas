# ADR-001: Dashboard shell on MIT @nuxt/ui v4

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/saas.md

## Context

The starter ships a dashboard application (`apps/saas`) that needs a complete application
shell: sidebar navigation, global search, user menu, dark mode, settings/profile pages. The
original architecture doc fixed the UI stack as "Nuxt UI (v4) + Tailwind CSS", but the app was
bootstrapped from the **Nuxt UI Pro dashboard template**, and several 2025-era documents
(the discarded gap analyses, the old uix plan and README) still described the repo as using
"Nuxt UI Pro".

That claim is wrong for this repo, and the distinction matters:

- In **@nuxt/ui v4** the components formerly sold as Nuxt UI Pro (dashboard primitives such
  as `UDashboardGroup`/`UDashboardSidebar`/`UDashboardSearch`, pricing components, chat
  components) were merged into the single **MIT-licensed** `@nuxt/ui` package.
- No `@nuxt/ui-pro` dependency exists in any `package.json` in the monorepo (verified
  2026-07-08). There is no license key and no paid dependency.

## Decision

Build all product UI on **@nuxt/ui v4 (MIT) + Tailwind CSS v4**, and compose the dashboard
shell from @nuxt/ui's dashboard components rather than hand-rolling layout chrome.

Concretely (all verified in code):

| Element | Where |
|---|---|
| Module registration | `layers/uix/nuxt.config.ts` — registers `@nuxt/ui` once for every consumer, bundles `lucide` icons server-side |
| Design tokens | `layers/uix/assets/css/main.css` — `@theme` (Public Sans font, brand green palette, dark-mode `--ui-bg` override) |
| Dashboard shell | `layers/saas/layouts/default.vue` — layer-owned `UDashboardGroup` shell fed from composed navigation config |
| Version | `"@nuxt/ui": "^4.9.0"` in `apps/saas/package.json`, `layers/uix/package.json`, `layers/saas/package.json` |

Any documentation referring to "Nuxt UI Pro" as part of this stack is documentation drift.
The documents that asserted it were discarded during the `.context/` migration
([ADR-003](./ADR-003-context-directory-migration.md)).

## Consequences

**Benefits**

- No license cost or key management; the full dashboard component set is upstream-maintained MIT code.
- One design system across the dashboard app, the auth pages, and the (future) landing site —
  all through the `uix` foundation layer (see [../../patterns/layers.md](../../patterns/layers.md)).
- Components are auto-imported and tree-shaken; theming is plain Tailwind v4 `@theme` tokens.

**Costs / current status**

- E03 completed the decision by moving the chosen Nuxt UI shell into `layers/saas` and deleting the
  parallel app shell, template pages/endpoints and outbound template links.
- Brand color configuration is not yet coherent: `saas.theme.colors` has no reader while effective
  Nuxt UI colors live under `ui.colors`. E26/E27 establish and project the product color contract.
- **The uix layer is minimal today**: module registration + CSS tokens only, no components or
  composables of its own. The larger design system described in
  [../../prd/uix.md](../../prd/uix.md) (layout primitives, empty/loading/error states,
  `useTheme`) is **not implemented**.
