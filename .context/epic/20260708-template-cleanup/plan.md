# E03 — Plan

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new

How [spec.md](./spec.md) gets executed. Five phases, ordered so that every phase leaves the tree
buildable and each structural change lands after the deletions that would otherwise conflict with
it. Task IDs refer to [tasks.md](./tasks.md); decisions referenced are recorded in
[design.md](./design.md).

## Phase A — Remove external pointers and decorative consent (T01–T04)

Small, independent edits with no structural risk. Done first because they touch
`apps/saas/app/layouts/default.vue`, which Phase C later moves — the file must be in its final
*content* state before it is ported, so the port is a verbatim move.

- Strip `footerNavigation` (Nuxt UI Pro links) from `layers/saas/config/navigation.ts` and its
  wiring in `apps/saas/app/app.config.ts`.
- Strip the template userMenu groups (Templates / Documentation / GitHub repository / Upgrade to Pro).
- Strip the "View page source" search group and the cookie-consent toast from the default layout.

**Gate**: AC1 grep clean for links; AC6 grep clean for `cookie-consent`; app boots (`pnpm saas:dev`),
sidebar/search/user menu render without the removed groups.

## Phase B — Delete the mock data plane (T05–T09)

All fake-data surfaces go, consumers first: pages/components → endpoints → package deps (execution
order T06 → T07 → T08 → T05 → T09; task IDs stable, see tasks.md). Deleting each page before the
mock endpoint it fetches from keeps every intermediate commit runtime-functional — the reverse
order would ship commits whose pages call deleted endpoints. Per design D2 these are deletions,
not dev-guards.

Deliberate transitional state: deleting the demo home un-shadows `layers/saas/pages/index.vue`,
which still declares `layout: 'dashboard'` — so `/` temporarily renders in the old hand-made shell
while `/settings/**` renders in the template shell. Functional and honest, just visually
inconsistent; Phase C resolves it. This ordering is chosen because the reverse (shell first) would
have the consolidated layout still rendering `<NotificationsSlideover />` fed by a mock endpoint.

**Gate**: AC2, AC3, AC9 greps clean; `/` shows "Welcome, {name}" (old shell); `/customers`, `/inbox`
return 404; `pnpm install` and dev boot clean after dep removal.

## Phase C — One shell (T10–T13)

The structural core, per design D1: the `UDashboardGroup` layout moves into the layer; the hand-made
shell dies; one `UserMenu` survives, in the layer.

Order inside the phase matters:
1. **T10** add `layers/saas/layouts/default.vue` (port) — app still has its own identical layout
   shadowing it, so this is a no-op at runtime.
2. **T11** consolidate `UserMenu` in the layer (port the richer app one; local-initials avatar;
   `data-testid="user-menu"`), delete `apps/saas/app/components/UserMenu.vue`.
3. **T12** delete `apps/saas/app/layouts/default.vue` — the layer layout takes over every route.
   Smoke test here.
4. **T13** delete the hand-made shell (`dashboard.vue`, `AppHeader.vue`, `AppSidebar.vue`), adapt
   `layers/saas/pages/index.vue` to `UDashboardPanel`, prune dead `layouts.dashboard.*` config keys,
   re-wire `features.workspaceSwitcher` into the new layout.

**Gate**: AC4, AC7, AC8 — `/`, `/settings`, `/settings/members`, `/settings/billing`, `/profile`,
`/auth/login` all render in the single shell; sidebar collapse, global search, workspace switcher,
user menu (theme/appearance/logout) all work; `find` reports one `UserMenu.vue`, zero app layouts.

## Phase D — Local avatars (T14)

Replace the remaining `ui-avatars.com` URLs (workspace switcher, workspaces settings page) with
`UAvatar` initials fallback. Independent of Phase C except that the UserMenu instance was already
fixed there.

**Gate**: AC5 grep clean; avatars render as initials with no network requests to third parties
(check devtools network tab on `/` and `/settings/workspaces`).

## Phase E — Documentation truth + final verification (T15–T19)

Docs last, because `layers/saas/README.md` must describe the *post*-consolidation shell.

- Rewrite `layers/uix/README.md` against reality (no Pro, no app.config, thin layer).
- "Nuxt 3" → Nuxt 4 sweep in layer READMEs.
- Remove the false `createLogger` adoption claims from `layers/amplify/README.md` and `AGENTS.md`
  (reword as "available utility, not yet adopted; adoption decision is E10").
- Update `layers/saas/README.md` (layouts/components tree, onboarding layout marked unused).
- Full acceptance sweep: every AC grep + build + e2e auth/billing against a sandbox.

**Gate**: AC10, AC11; typecheck error count ≤ 341 baseline (no new errors).

## Sequencing constraints (summary)

```
A (T01–T04) ──► C (T10–T13) ──► E (T15–T19)
B (T05–T09) ──► C            ┌► D (T14) ──► E
A,B independent of each other; D depends only on C's UserMenu consolidation (T11)
```

## Rollback

Every phase is a plain git revert unit; no data migrations, no backend changes (nothing under
`apps/backend` is touched). The riskiest step (T12, app layout deletion) is a single-file revert
that restores the shadowing layout.

## Explicitly not done here

Building replacements for anything deleted (notifications → E14, support links → E20, admin
customers view → E18, consent → E19), adopting the logger (E10), fixing ghost forms (E02), CI
green (E01). See spec "Out of scope".
