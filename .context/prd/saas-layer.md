# PRD: SaaS Meta-Layer (`@mmshark/saas-layer`)

> **Status**: Active · **Reconciled**: 2026-07-11 · **Source**: code, E03 completion

## Purpose

`layers/saas` composes Amplify, UIX, i18n, auth, billing, workspaces and entitlements and owns the
single reusable application shell. A consuming app extends one layer and supplies instance
configuration; it does not maintain a parallel dashboard shell.

## Current contract

### Composition

`layers/saas/nuxt.config.ts` extends the seven foundation/feature layers. `apps/saas` extends the
SaaS layer plus the debug layer. Cross-layer business logic remains in its owning feature layer.

### Shell and layouts

| Layout | Purpose | Status |
|---|---|---|
| `layers/saas/layouts/default.vue` | Authenticated Nuxt UI dashboard shell, sidebar/search/navigation/user menu | Implemented and used |
| `layers/saas/layouts/auth.vue` | Branded guest/authentication shell | Implemented and used |
| `layers/saas/layouts/onboarding.vue` | Future first-run shell | Orphan; no route consumes it |

E03 removed the app-local `apps/saas/app/` shell, mock pages/endpoints and template links. There is
now one shell and one `UserMenu`, both owned by the layer.

### Routes

| Route | Owner |
|---|---|
| `/` and `/auth/*` | `layers/saas/pages/` |
| `/settings`, `/settings/members`, `/settings/workspaces` | workspace/settings pages in the layer |
| `/settings/billing`, `/settings/billing/plans` | billing settings and E05 upgrade catalog |
| `/profile`, `/profile/account`, `/profile/security`, `/profile/notifications` | user profile pages |

`/settings/*` is workspace-scoped; `/profile/*` is user-scoped. Parent pages provide toolbar and
navigation composition from `layers/saas/config/navigation.ts`.

### Configuration

Today `layers/saas/app.config.ts` defines `brand`, navigation placeholders, feature flags, layouts
and theme keys; the app composes navigation arrays explicitly. Brand/navigation are consumed, while
`saas.theme.colors`, `features.multiWorkspace` and `features.onboarding` are decorative debt.

The target boundary is roadmap E26–E28:

- `saas.config.ts` owns stable product facts;
- adapters project relevant facts into app/backend consumers;
- `app.config.ts` retains app presentation and navigation arrays;
- environment variables/runtime config/Amplify secrets retain environment and secret values.

## Requirements

1. Exactly one layer-owned responsive dashboard shell using MIT `@nuxt/ui` v4.
2. Apps customize through configuration and deliberate file overrides, never a wholesale shell fork.
3. Navigation arrays use explicit build-time composition; layer app-config defaults contain no
   non-empty arrays.
4. Every configuration key has a consumer or is removed.
5. Authenticated routes use the auth middleware; workspace actions retain server-side authorization.
6. Onboarding and notifications are not claimed as implemented until E15/E14 criteria pass.
7. Shell navigation, responsive behavior, dark mode and accessibility receive E2E coverage in E11.

## Open gaps

- Notification preferences still discard changes (E14).
- Onboarding layout/flag have no product flow (E27 removes decorative config; E15 builds the flow).
- Client entitlement components/middlewares are not adopted by product pages (E06).
- Account password/email/delete/avatar flows are incomplete (E07).
- Debug layer is composed unconditionally; page guards prevent production access, but conditional
  composition would reduce exposure (security hardening).

## Related

- [Roadmap](../roadmaps/20260711-saas-boilerplate-productization.md)
- [App-config composition](../patterns/app-config-composition.md)
- [Navigation composition](../patterns/navigation-config.md)
- [SaaS app PRD](saas-app.md)
- [UIX PRD](uix.md)
