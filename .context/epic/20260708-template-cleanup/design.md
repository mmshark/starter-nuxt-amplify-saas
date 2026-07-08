# E03 — Design decisions

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new (code evidence gathered 2026-07-08)

Two decisions in this epic are judgment calls; this file records the evidence and rationale so the
outcome survives the people who made it. Everything else in [spec.md](./spec.md) is straight deletion.

## D1 — Which dashboard shell survives

### Constraint

`doc/adr/saas-layer.md` (the SaaS meta-layer ADR): `layers/saas` is the **publishable product
shell** — apps are thin consumers that compose config. Whatever shell survives must therefore live
in `layers/saas`. The starting bias was "keep the layers/saas hand-made shell". Code reality
inverted the *implementation* while preserving the *principle*.

### Evidence

| Fact | Source |
|---|---|
| The hand-made shell (`layers/saas/layouts/dashboard.vue` + `AppHeader.vue` + `AppSidebar.vue`) has exactly one consumer: `layers/saas/pages/index.vue:86` (`layout: 'dashboard'`) | grep for `layout: 'dashboard'` across `apps/` and `layers/` |
| That one consumer is shadowed in the reference app by `apps/saas/app/pages/index.vue` (Nuxt app-over-layer page precedence) → **the hand-made shell renders on zero routes** and rots unexercised | onboarding + uix audit sections, re-verified |
| The layer's own settings/profile pages are built on `UDashboardPanel`/`UDashboardNavbar` (`layers/saas/pages/settings.vue:13`, `layers/saas/pages/profile.vue:13`) with no explicit layout → they render in the app's default layout and **require a `UDashboardGroup` ancestor**, which only `apps/saas/app/layouts/default.vue:73` provides | file reads |
| So the layer is *already* coupled to the `UDashboardGroup` shell — it just doesn't ship it. A consumer app that extends `@mmshark/saas-layer` without recreating that layout gets broken settings/profile pages | consequence of the two rows above |
| The two `UserMenu.vue` components diverge: the layer one (`layers/saas/components/UserMenu.vue:11`) renders `userAttributes.picture` — an attribute **no flow ever sets** (storage audit) — and flat config links; the app one (`apps/saas/app/components/UserMenu.vue`) has theme/appearance selectors and processes the config-driven menu, but hits `ui-avatars.com:24` and lacks the `data-testid="user-menu"` that `apps/saas/tests/e2e/config/selectors.json:122` expects | file reads |
| `UDashboard*` components are MIT in `@nuxt/ui` v4, registered by `layers/uix/nuxt.config.ts` — no Pro license blocks a layer from shipping them | `layers/uix/nuxt.config.ts`, `apps/saas/package.json` (`@nuxt/ui: ^4.9.0`) |
| `WorkspaceSwitcher` (used in the shell header) lives in `layers/workspaces`, which `layers/saas` extends (`layers/saas/nuxt.config.ts`) — available to a layer-hosted layout | file reads |

### Options

| Option | Verdict |
|---|---|
| **A. Keep hand-made layer shell, delete app shell** (the naive ADR reading) | Rejected. Requires rebuilding `settings.vue`/`profile.vue` off `UDashboardPanel`, discards the feature-richer shell (search, collapsible/resizable sidebar, workspace switcher slot), and keeps a shell that has never rendered in the product. Highest effort, lowest value. |
| **B. Keep app shell where it is, delete layer shell** | Rejected. Violates the layer-first ADR: every consumer app of `@mmshark/saas-layer` would have to copy-paste the layout to make the layer's own pages work. |
| **C. Move the `UDashboardGroup` shell into `layers/saas/layouts/default.vue`; delete both old shells' remains** | **Chosen.** Honors the ADR (shell publishable in the layer) and code reality (layer pages need `UDashboardGroup`). Net code delete. |

### Consequences (executed in plan Phase C)

- `layers/saas/layouts/default.vue` = verbatim port of `apps/saas/app/layouts/default.vue` (after
  Phase A strips the "View page source" search group and cookie toast, and Phase B strips
  `<NotificationsSlideover />`). Navigation stays config-driven via `appConfig.saas.navigation.sidebar`.
- `layers/saas/components/UserMenu.vue` = port of the app `UserMenu` (theme/appearance selectors,
  config-driven groups, `signOut`), minus `ui-avatars.com` (local `UAvatar` initials), plus
  `data-testid="user-menu"`.
- Delete: `layers/saas/layouts/dashboard.vue`, `layers/saas/components/AppHeader.vue`,
  `layers/saas/components/AppSidebar.vue`, `apps/saas/app/layouts/default.vue`,
  `apps/saas/app/components/UserMenu.vue`.
- `layers/saas/pages/index.vue` drops `layout: 'dashboard'` and wraps its content in a
  `UDashboardPanel` (same pattern as `settings.vue`) so it renders in the consolidated shell.
- Config/type cleanup: `saas.layouts.dashboard.*` keys (`layers/saas/app.config.ts:20-21`,
  `layers/saas/types/saas-config.ts:40-41`) were read only by the deleted shell — remove them rather
  than leave dead config. `saas.features.workspaceSwitcher` (read only by the deleted
  `AppHeader.vue:22`) is re-wired to gate `WorkspaceSwitcher` in the new layout so the flag stays
  truthful. `layouts.auth.*` keys stay (consumed by `layers/saas/layouts/auth.vue:5,25`).
- `layers/saas/layouts/onboarding.vue` is intentionally untouched (orphan; E15 owns onboarding) —
  but `layers/saas/README.md` must stop presenting it as a working feature.

## D2 — Demo pages: delete vs. dev-only demo

Options considered for `customers.vue`, `inbox.vue`, demo home + `NotificationsSlideover`:

| Option | Verdict |
|---|---|
| Keep behind `import.meta.dev` guard as UI showcase | Rejected. Keeps five demo-only npm dependencies (`@unovis/*`, `date-fns`, `@internationalized/date`, `@tanstack/table-core`), three unauthenticated endpoints (or work to auth them — for fake data), the `~/types` demo type file, and permanent "is this real?" ambiguity for starter adopters. The repo already has `layers/debug` for dev-only surfaces, and the upstream Nuxt UI dashboard template remains available as reference. |
| **Delete outright** | **Chosen** — for all three surfaces, per phase-0 exit criterion "no mock-fed pages presented as product". |

Per-surface outcome:

| Surface | Outcome |
|---|---|
| Home | Delete demo home + `components/home/`; `/` falls back to the real, currently-shadowed `layers/saas/pages/index.vue` (welcome + workspace/plan/member cards) — adapted to the consolidated shell (D1). No replacement needs building. |
| Customers | Delete page + `components/customers/` + `server/api/customers.ts` + sidebar entry. Real cross-tenant admin is E18. |
| Inbox | Delete page + `components/inbox/` + `server/api/mails.ts` + sidebar entry (fake badge `'4'`). No product counterpart planned. |
| Notifications slideover | Delete component + `server/api/notifications.ts` + `useDashboard.ts` (its only remaining purpose is the `n` shortcut and `g-i`/`g-c` shortcuts to deleted routes). Real notifications are E14; it should reintroduce a bell wired to a real model, not resurrect this mock. |
