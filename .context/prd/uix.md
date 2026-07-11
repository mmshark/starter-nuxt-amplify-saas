# PRD: UIX — UI Foundation & Theming

> **Status**: Active · **Reconciled**: 2026-07-11 · **Source**: code, E03 completion

## Purpose

UIX provides the shared visual foundation: MIT `@nuxt/ui` v4, Tailwind CSS v4 tokens, Iconify/Lucide,
color mode and the layer-owned SaaS application shell. Business-domain components remain in their
feature layers.

## Implemented

| Capability | Evidence |
|---|---|
| Nuxt UI v4 and Lucide registration | `layers/uix/nuxt.config.ts` |
| Tailwind v4 tokens and dark background override | `layers/uix/assets/css/main.css` |
| One responsive dashboard/auth shell | `layers/saas/layouts/default.vue`, `auth.vue` |
| Navigation and user menu | `layers/saas/config/navigation.ts`, `components/UserMenu.vue` |
| Persisted light/dark/system preference | Nuxt color-mode integration |

E03 deleted the duplicated `apps/saas/app/` shell, fake charts/pages/endpoints, external avatar
services and Nuxt UI template links. Documentation that still describes two shells is superseded by
this reconciled PRD and the E03 changelog/spec.

## Target requirements

1. `@nuxt/ui` v4 remains the single component library; no paid Pro package or license.
2. Stable product brand colors originate in `saas.config.ts` (E26) and reach `ui.colors` through an
   explicit adapter (E27); per-user color changes, if retained, must persist rather than mutate app
   config only in memory.
3. Shared empty/loading/error/page-header primitives have typed, accessible APIs.
4. Responsive shell controls meet keyboard, focus, landmark and touch-target requirements.
5. Theme, shell, responsive and axe-core coverage is part of E11.
6. Layer README/API claims are verified against exported code.

## Current gaps

- `layers/uix` is intentionally minimal and has no shared state components or `useTheme`/
  `useBreakpoints` abstractions.
- `saas.theme.colors` is decorative; effective colors live under Nuxt UI's `ui.colors` (E27).
- The onboarding layout is not a working onboarding product (E15).
- There is no dedicated theme/responsive/accessibility test suite (E11).

## Related

- [Roadmap](../roadmaps/20260711-saas-boilerplate-productization.md)
- [SaaS layer PRD](saas-layer.md)
- [ADR-001](../architecture/decisions/ADR-001-nuxt-ui-dashboard-shell.md)
