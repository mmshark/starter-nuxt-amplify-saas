# E03 — Tasks

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new

Dependency-ordered work queue for [plan.md](./plan.md). One task = one commit-sized, revertible
change that leaves the tree buildable. File references verified 2026-07-08; line numbers drift as
earlier tasks land — anchors (symbol names) are authoritative.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done.

## Phase A — External pointers & decorative consent

- [ ] **T01 — Remove `footerNavigation` placeholder links**
  - Delete the `footerNavigation` export (`layers/saas/config/navigation.ts:72-82`, Feedback / Help & Support → Nuxt UI Pro repos).
  - Remove its import and the `sidebar.footer` wiring in `apps/saas/app/app.config.ts:1,32-34` (leave the `footer` key absent; the layout already tolerates missing config via `?? [[]]`).
  - Depends on: —
  - Verify: `grep -rn "footerNavigation" apps layers` → 0 hits (excl. `.nuxt`); sidebar renders without the two links.

- [ ] **T02 — Remove template userMenu groups**
  - In `apps/saas/app/app.config.ts:53-92` delete the "Templates" group (6 `*.nuxt.dev` links) and the "Documentation" / "GitHub repository" / "Upgrade to Pro" group. Keep the profile items (`userMenuItems`) and the Theme/Appearance selector group.
  - Depends on: —
  - Verify: `grep -n "nuxt.dev\|ui.nuxt.com\|nuxt-ui-pro" apps/saas/app/app.config.ts` → 0 hits; user menu shows profile items + theme/appearance + Log out only.

- [ ] **T03 — Remove "View page source" search group**
  - In `apps/saas/app/layouts/default.vue:30-44` drop the `code` group from `groups`; keep the `links` group.
  - Depends on: —
  - Verify: `grep -n "nuxt-ui-pro" apps/saas/app/layouts/default.vue` → 0 hits; `Cmd+K` search shows only "Go to".

- [ ] **T04 — Remove decorative cookie-consent toast**
  - Delete the `onMounted`/`useCookie('cookie-consent')` block (`apps/saas/app/layouts/default.vue:46-69`) and now-unused `toast` binding.
  - Depends on: —
  - Verify: `grep -rn "cookie-consent" apps layers` → 0 hits (AC6); no toast on first load.

## Phase B — Mock data plane

Consumers first, endpoints last (execution order **T06 → T07 → T08 → T05 → T09**; task IDs kept
stable): the demo pages/slideover are the mock endpoints' only consumers, so deleting them first
leaves every intermediate commit runtime-functional — no commit ships a page fetching a deleted
endpoint.

- [ ] **T06 — Delete Customers demo page**
  - Delete `apps/saas/app/pages/customers.vue` and `apps/saas/app/components/customers/` (`AddModal.vue`, `DeleteModal.vue`).
  - Remove the "Customers" sidebar item from `apps/saas/app/app.config.ts:24-27`.
  - Depends on: —
  - Verify: `/customers` → 404; no sidebar entry.

- [ ] **T07 — Delete Inbox demo page**
  - Delete `apps/saas/app/pages/inbox.vue` and `apps/saas/app/components/inbox/` (`InboxList.vue`, `InboxMail.vue`).
  - Remove the "Inbox" sidebar item with its fake `badge: '4'` from `apps/saas/app/app.config.ts:19-23`.
  - Depends on: —
  - Verify: `/inbox` → 404; no sidebar entry or badge.

- [ ] **T08 — Delete demo home, notifications slideover, and their plumbing**
  - Delete `apps/saas/app/pages/index.vue` (un-shadows `layers/saas/pages/index.vue`), `apps/saas/app/components/home/` (6 components incl. `HomeChart.client.vue` `Math.random`), `apps/saas/app/components/NotificationsSlideover.vue`, `apps/saas/app/composables/useDashboard.ts` (shortcuts `g-i`/`g-c`/`n` now target deleted surfaces), `apps/saas/app/utils/index.ts` (`randomInt`/`randomFrom`), `apps/saas/app/types/index.d.ts` (demo types; verified no non-demo consumers).
  - Remove `<NotificationsSlideover />` from `apps/saas/app/layouts/default.vue:115`.
  - Depends on: T06, T07
  - Verify: `grep -rn "Math.random\|randomInt\|randomFrom\|useDashboard\|~/types" apps/saas/app` → 0 hits (AC3); `/` renders "Welcome, {name}" (transitionally in the old hand-made shell — expected until T12/T13).

- [ ] **T05 — Delete unauthenticated mock endpoints**
  - Delete `apps/saas/server/api/customers.ts`, `apps/saas/server/api/mails.ts`, `apps/saas/server/api/notifications.ts` (remove the `api/` dir if empty).
  - Note for E02: this closes its "unauthenticated demo endpoints" item — don't double-fix.
  - Depends on: T06, T07, T08 (their pages/slideover were these endpoints' only consumers — after them this deletion removes dead code only)
  - Verify: `ls apps/saas/server/api/ 2>/dev/null` → no mock files (AC2); `grep -rln "pravatar" apps` → 0 hits.

- [ ] **T09 — Prune demo-only dependencies**
  - Remove from `apps/saas/package.json`: `@unovis/ts`, `@unovis/vue`, `date-fns`, `@vueuse/nuxt` (deps); `@internationalized/date`, `@tanstack/table-core`, `scule`, `@vueuse/core` (devDeps). Verified 2026-07-08: after T08, the only first-party importers of all of these are the deleted demo files (`@vueuse/nuxt` was never even registered in `modules`; layers reference `createSharedComposable` only in comments). Keep `mailparser`/`node-imap` (e2e IMAP helpers). Re-run the consumer grep at execution time before deleting each dep.
  - Run `pnpm install`.
  - Depends on: T05, T08
  - Verify: AC9 grep clean; `pnpm saas:dev` boots; `pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck` error count ≤ 341 baseline.

## Phase C — One shell (design D1)

- [ ] **T10 — Ship the shell from the layer**
  - Create `layers/saas/layouts/default.vue` as a verbatim port of the post-Phase-A/B `apps/saas/app/layouts/default.vue` (UDashboardGroup + UDashboardSidebar + WorkspaceSwitcher + config-driven `UNavigationMenu` + UDashboardSearch + UserMenu footer).
  - No runtime change yet: the app's own layout still shadows it.
  - Depends on: T03, T04, T08 (layout content final)
  - Verify: `pnpm saas:dev` boots; behavior unchanged.

- [ ] **T11 — One UserMenu, in the layer**
  - Replace `layers/saas/components/UserMenu.vue` (reads never-set `userAttributes.picture`) with a port of `apps/saas/app/components/UserMenu.vue` (theme/appearance selectors, config-driven groups, `signOut`), with two fixes: local `UAvatar` initials instead of `ui-avatars.com` (line 24 of the app version), and `data-testid="user-menu"` on the trigger (expected by `apps/saas/tests/e2e/config/selectors.json:122`).
  - Delete `apps/saas/app/components/UserMenu.vue`.
  - Depends on: T10
  - Verify: `find apps layers -name "UserMenu.vue" -not -path "*node_modules*" -not -path "*.nuxt*"` → 1 result (AC7); menu works from sidebar footer.

- [ ] **T12 — Delete the app layout**
  - Delete `apps/saas/app/layouts/default.vue`; the layer layout from T10 takes over all routes.
  - Depends on: T10, T11
  - Verify: `/settings`, `/settings/members`, `/settings/billing`, `/profile`, `/auth/login` render correctly (AC8); sidebar collapse + `Cmd+K` search work.

- [ ] **T13 — Delete the hand-made shell; adapt the welcome page**
  - Delete `layers/saas/layouts/dashboard.vue`, `layers/saas/components/AppHeader.vue`, `layers/saas/components/AppSidebar.vue`.
  - `layers/saas/pages/index.vue`: drop `layout: 'dashboard'` from `definePageMeta` (:85-88) and wrap content in `UDashboardPanel` + `UDashboardNavbar` (same pattern as `layers/saas/pages/settings.vue`).
  - Config/type prune per design D1: remove `saas.layouts.dashboard.*` (`layers/saas/app.config.ts:19-22`, `layers/saas/types/saas-config.ts:39-42`); gate `WorkspaceSwitcher` in the new layout with `saas.features.workspaceSwitcher` (previously read only by the deleted `AppHeader.vue:22`). Keep `layouts.auth.*` (consumed by `layers/saas/layouts/auth.vue`). Leave `layouts/onboarding.vue` and `features.onboarding` untouched (E15).
  - Depends on: T12
  - Verify: `grep -rn "AppHeader\|AppSidebar\|layout: 'dashboard'\|sidebarCollapsible" apps layers` → 0 hits (excl. `.nuxt`); `/` renders welcome page inside the consolidated shell (AC4).

## Phase D — Local avatars

- [ ] **T14 — Replace remaining `ui-avatars.com` with local initials**
  - `layers/workspaces/components/WorkspaceSwitcher.vue:11,52` and `layers/saas/pages/settings/workspaces.vue:27,83`: drop the external `src`, rely on `UAvatar` text/`alt` initials fallback (`:alt="workspace.name"` / `:text="initials"`).
  - Depends on: T11 (UserMenu instance already fixed there)
  - Verify: `grep -rn "pravatar\|ui-avatars" apps layers` → 0 hits (AC5); no third-party image requests in devtools on `/` and `/settings/workspaces`.

## Phase E — Documentation truth + verification

- [ ] **T15 — Rewrite `layers/uix/README.md` against reality**
  - Remove all Nuxt UI Pro claims (lines 3, 18, 155) and the phantom `app.config.ts` from the architecture tree and configuration docs (lines 32, 44, 132, 346). Describe what exists: `nuxt.config.ts` registering `@nuxt/ui` (MIT v4) with lucide server bundle, `assets/css/main.css` theme tokens (`@theme`, Public Sans, green palette, dark `--ui-bg` override). Anything aspirational goes under an explicit "Not implemented" note pointing at `.context/prd/uix.md`.
  - Depends on: — (can run parallel to C/D)
  - Verify: `grep -n "Nuxt UI Pro\|app.config" layers/uix/README.md` → 0 hits.

- [ ] **T16 — "Nuxt 3" → Nuxt 4 sweep in layer READMEs**
  - Fix verified occurrences: `layers/auth/README.md:3,19,587`, `layers/billing/README.md:3,17`, `layers/i18n/README.md:3`, `layers/debug/README.md:3` (plus `layers/uix/README.md:3`, covered by T15).
  - Depends on: —
  - Verify: `grep -rn "Nuxt 3" layers/*/README.md` → 0 hits (AC10).

- [ ] **T17 — Remove false `createLogger` adoption claims**
  - `layers/amplify/README.md:27,42,158-167` and `AGENTS.md:269`: reword to the truth — `createLogger(scope)` exists in `layers/amplify/utils/logger.ts` but has **0 call sites**; server code currently uses raw `console.*`; adopt-or-delete is E10's decision. Keep accurate API usage docs, drop "used instead of ad hoc `console.*`" / "Used across server routes and Lambdas".
  - Depends on: —
  - Verify: `grep -rn "instead of ad hoc\|Used across server" layers/amplify/README.md AGENTS.md` → 0 hits (AC10).

- [ ] **T18 — Update `layers/saas/README.md` to the consolidated shell**
  - Fix the layouts list (line 109) and architecture tree (line 163): layouts are now `default` (dashboard shell), `auth`, `onboarding` (explicitly marked **unused — E15**); components list drops `AppHeader`/`AppSidebar`, keeps consolidated `UserMenu`; remove references to deleted config keys (`layouts.dashboard.*`).
  - Depends on: T13
  - Verify: README names no deleted file; `grep -n "AppHeader\|AppSidebar\|dashboard.vue" layers/saas/README.md` → 0 hits.

- [ ] **T19 — Final acceptance sweep**
  - Run every AC check from [spec.md](./spec.md) §Acceptance criteria (AC1–AC10 greps/finds).
  - AC11: `pnpm saas:build` with a sandbox-generated `amplify_outputs.json`; `pnpm saas:test:e2e:auth` and `pnpm saas:test:e2e:billing` against the sandbox; typecheck error count ≤ 341 baseline.
  - Update roadmap E03 status (`.context/prd/roadmap.md`) to done when green; note outcome in `.context/changelogs/` if warranted.
  - Depends on: T01–T18
  - Verify: all ACs pass; record command outputs in the PR description.
