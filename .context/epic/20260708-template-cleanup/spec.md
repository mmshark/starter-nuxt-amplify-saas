# E03 — Template Cleanup: remove Nuxt UI dashboard template residue

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new (roadmap E03 + verified feature audit 2026-07-08)

Phase 0 epic — see [roadmap](../../prd/roadmap.md) § Phase 0. Objective: after this epic, **nothing
in the product fakes functionality or points at third-party (Nuxt UI Pro) resources**, and the app
has exactly **one dashboard shell**.

`apps/saas` was bootstrapped from the Nuxt UI dashboard template. The demo scaffolding was never
removed: it ships fake business pages fed by unauthenticated mock endpoints, random-number charts,
links that send users to Nuxt UI Pro repos, avatars fetched from third-party services, a cookie
banner that gates nothing, and a second dashboard shell that shadows the real one in `layers/saas`.
Every item below was re-verified against code on 2026-07-08 (audit sections: uix, customer-support,
notifications, onboarding, admin, analytics, security).

## Verified current state

### 1. Placeholder links to Nuxt UI Pro resources

| Location | Residue |
|---|---|
| `layers/saas/config/navigation.ts:72-82` | `footerNavigation`: "Feedback" → `github.com/nuxt-ui-pro/dashboard`, "Help & Support" → `github.com/nuxt/ui-pro` |
| `apps/saas/app/app.config.ts:53-92` | userMenu groups: "Templates" (6 links to `*-template.nuxt.dev`), "Documentation" (`ui.nuxt.com/...pro/nuxt`), "GitHub repository" (`github.com/nuxt-ui-pro/dashboard`), "Upgrade to Pro" (`ui.nuxt.com/pro/purchase`) |
| `apps/saas/app/layouts/default.vue:34-44` | Global search (`UDashboardSearch`) "Code" group: "View page source" links to the Nuxt UI Pro dashboard template GitHub for the current route |

`footerNavigation` is consumed only by `apps/saas/app/app.config.ts` (sidebar footer) and rendered
by `apps/saas/app/layouts/default.vue`. No real feedback/help destination exists (customer-support
audit: nothing implemented; roadmap E20 owns that) — so the honest fix is **removal**, not retargeting.

### 2. Mock-fed demo pages

| Surface | Fed by | Notes |
|---|---|---|
| `apps/saas/app/pages/customers.vue` (+ `apps/saas/app/components/customers/`) | `apps/saas/server/api/customers.ts` | TanStack table over fake customers with `i.pravatar.cc` avatars |
| `apps/saas/app/pages/inbox.vue` (+ `apps/saas/app/components/inbox/`) | `apps/saas/server/api/mails.ts` | 691-line hardcoded fake mailbox |
| `apps/saas/app/pages/index.vue` (demo home, + `apps/saas/app/components/home/`) | client-side RNG | `HomeChart.client.vue:34` uses `Math.random()`; `HomeStats.vue:50-51` / `HomeSales.vue:26-34` use `randomInt`/`randomFrom` from `apps/saas/app/utils/index.ts` — fake revenue/customer metrics on every render |
| `apps/saas/app/components/NotificationsSlideover.vue` | `apps/saas/server/api/notifications.ts` | Fake notification center; bell badge (`UChip`) always on; opened from demo home and the `n` shortcut in `apps/saas/app/composables/useDashboard.ts` |

- All three `apps/saas/server/api/*.ts` endpoints are **unauthenticated**: the only server auth
  middleware (`layers/workspaces/server/middleware/auth.ts:11`) early-returns for any path outside
  `/api/workspaces` (confirmed in security audit).
- The demo home **shadows a real page**: `layers/saas/pages/index.vue` is a working
  "Welcome, {name}" page (workspace, plan, member count via `useWorkspace`/`useBilling`) that never
  renders in the app because Nuxt gives app pages precedence.
- Demo-only dependencies in `apps/saas/package.json`: `@unovis/ts`, `@unovis/vue`, `date-fns`,
  `@internationalized/date`, `@tanstack/table-core`, `scule`, `@vueuse/core`, `@vueuse/nuxt`
  (verified: their only first-party importers are the demo files above; `@vueuse/nuxt` is not even
  registered as a module).
- No e2e spec touches `/customers`, `/inbox` or home content (specs cover auth + billing only).

**Decision** (see [design.md](./design.md)): **delete** all three demo surfaces, do not keep them
as dev-only demos. `/` falls back to the real welcome page.

### 3. External avatar/image dependencies

| Service | Locations |
|---|---|
| `i.pravatar.cc` | `apps/saas/server/api/customers.ts`, `mails.ts`, `notifications.ts` (mock data — removed with item 2) |
| `ui-avatars.com` | `apps/saas/app/components/UserMenu.vue:24` · `layers/workspaces/components/WorkspaceSwitcher.vue:11,52` · `layers/saas/pages/settings/workspaces.vue:27,83` |

Note: the audit's "members list" pointer resolves to the **workspaces list**
(`layers/saas/pages/settings/workspaces.vue`); `layers/workspaces/components/WorkspaceMembersList.vue`
uses no avatars (verified by grep). Fix: render initials locally with `UAvatar` (its `alt`/text
fallback), no network call.

### 4. Decorative cookie-consent banner

`apps/saas/app/layouts/default.vue:46-69`: an `onMounted` toast reads/writes
`useCookie('cookie-consent')` but **gates nothing** — no script loading, no analytics (analytics
audit: zero providers integrated), and "Opt out" doesn't even persist. It performs compliance
theater. Fix: remove. Real consent wiring belongs to E19 (analytics) when there is something to consent to.

### 5. Duplicated dashboard shell

| | `layers/saas` (hand-made) | `apps/saas` (template) |
|---|---|---|
| Layout | `layouts/dashboard.vue` (plain divs) | `app/layouts/default.vue` (`UDashboardGroup`/`UDashboardSidebar`) |
| Components | `components/AppHeader.vue`, `components/AppSidebar.vue`, `components/UserMenu.vue` | `app/components/UserMenu.vue` (theme/appearance selectors, config-driven menu) |
| Actually renders? | **Never** in `apps/saas` — its only consumer is `layers/saas/pages/index.vue:86` (`layout: 'dashboard'`), which is shadowed by the demo home | **Everywhere** — default layout for all pages |
| Layer pages compatibility | `layers/saas/pages/settings.vue:13` and `profile.vue:13` use `UDashboardPanel`, which **requires** a `UDashboardGroup` ancestor — the hand-made shell cannot host them | Hosts them today |

**Decision** (rationale + alternatives in [design.md](./design.md)): the `UDashboardGroup` shell
wins on code reality, but per the layer-first architecture (`doc/adr/saas-layer.md`: `layers/saas`
is the publishable product shell, apps are thin consumers) it must **move into `layers/saas` as
`layouts/default.vue`**. The hand-made `dashboard.vue`/`AppHeader`/`AppSidebar` and the poorer layer
`UserMenu` (reads `userAttributes.picture`, which nothing ever sets) are deleted; the richer
app `UserMenu` is ported into the layer (keeping `data-testid="user-menu"`, expected by
`apps/saas/tests/e2e/config/selectors.json:122`).

### 6. Documentation drift at source

| Doc | False claim (verified) |
|---|---|
| `layers/uix/README.md` | Documents "Nuxt UI Pro" integration (lines 3, 18; config snippet with `@nuxt/ui-pro` module at line 155) and an `app.config.ts` in its architecture tree and config docs (lines 32, 132, 346) — the layer contains only `nuxt.config.ts` (registers MIT `@nuxt/ui`) + `assets/css/main.css`; no app.config, no components, no Pro. Also says "Nuxt 3" (line 3) |
| `layers/auth/README.md:3,19,587` · `layers/billing/README.md:3,17` · `layers/i18n/README.md:3` · `layers/debug/README.md:3` | Say "Nuxt 3"; the repo is Nuxt 4 (`nuxt: ^4.4.8`) |
| `layers/amplify/README.md:27,42,158-167` and `AGENTS.md:269` | Claim `createLogger` is "used instead of ad hoc `console.*`" / "Used across server routes and Lambdas" — grep shows **0 uses** outside its own definition (`layers/amplify/utils/logger.ts`) and the README; ~29 files use raw `console.*` |
| `layers/saas/README.md:109,163` | Documents the `onboarding` layout as a feature and a layouts/components tree that will be wrong after shell consolidation |

Fix: make the docs match the code (E03 does **not** adopt the logger — that is E10's
adopt-or-delete call; E03 only removes the false adoption claim).

## Out of scope (owned elsewhere)

| Item | Owner |
|---|---|
| Real notifications (model, authed API, bell) | E14 |
| Real feedback/help/support destinations | E20 |
| Onboarding wizard; the orphan `layers/saas/layouts/onboarding.vue` and dead `features.onboarding` flag | E15 |
| Real cookie-consent wiring for analytics | E19 |
| Ghost forms (`profile/security.vue`) and other lying wiring | E02 |
| Notification-preferences stub (`layers/saas/pages/profile/notifications.vue`, non-persisting) | E14 (consistent with E04's out-of-scope table; E02 does not cover it) |
| Adopting `createLogger` in server code (or deleting it) | E10 |
| CI green / typecheck debt (E03 must not add errors, but doesn't burn down the 341) | E01 |

## Acceptance criteria

All greps run from repo root, excluding `node_modules`, `.nuxt`, `.output`, `playwright-report`,
and the legacy `doc/` tree (historical docs are migrated/archived separately).

| # | Criterion | Verification |
|---|---|---|
| AC1 | No links to Nuxt UI Pro / template resources anywhere in product code or config | `grep -rn "nuxt-ui-pro\|ui.nuxt.com\|nuxt.dev" apps layers` → 0 hits |
| AC2 | The three mock endpoints are gone; `apps/saas/server/api/` contains no unauthenticated demo endpoints | `ls apps/saas/server/api/` → no `customers.ts`, `mails.ts`, `notifications.ts` |
| AC3 | No fake data in the UI: demo pages, home RNG charts, notifications slideover and their components/types/utilities removed | `grep -rn "Math.random\|randomInt\|randomFrom" apps/saas/app` → 0 hits; `apps/saas/app/pages/`, `apps/saas/app/components/` contain no `customers*`, `inbox*`, `home*`, `NotificationsSlideover*` |
| AC4 | `/` renders the real welcome page for a signed-in user ("Welcome, {name}", workspace/plan/member cards) inside the consolidated shell | manual smoke on `pnpm saas:dev`; page source is `layers/saas/pages/index.vue` |
| AC5 | No external image/avatar hosts | `grep -rn "pravatar\|ui-avatars" apps layers` → 0 hits; avatars render as local initials |
| AC6 | No decorative cookie consent | `grep -rn "cookie-consent" apps layers` → 0 hits |
| AC7 | Exactly one shell: `layers/saas/layouts/default.vue` (UDashboardGroup) exists; `apps/saas/app/layouts/` and `apps/saas/app/components/UserMenu.vue` are gone; `layers/saas/layouts/dashboard.vue`, `layers/saas/components/AppHeader.vue`, `AppSidebar.vue` are gone; exactly one `UserMenu.vue` under `layers/saas/components/` carrying `data-testid="user-menu"` | `find apps layers -name "UserMenu.vue" -not -path "*node_modules*" -not -path "*.nuxt*"` → 1 result |
| AC8 | Settings/profile pages (`UDashboardPanel`-based) render inside the layer-provided shell with the shell behaviors observable on each route: page content appears in a `UDashboardPanel` under the sidebar shell; sidebar collapse toggles; `Cmd+K` opens the dashboard search; the workspace switcher renders; the user menu opens from the sidebar footer with theme/appearance selectors and Log out | manual smoke on `/settings`, `/settings/members`, `/profile`, checking every listed behavior (same checklist as the plan Phase C gate) |
| AC9 | Demo-only deps removed | `grep -n "unovis\|date-fns\|internationalized/date\|tanstack\|scule\|vueuse" apps/saas/package.json` → 0 hits; `pnpm install` clean |
| AC10 | Layer READMEs truthful: no "Nuxt 3", no Nuxt UI Pro claims in uix, no logger-adoption claim | `grep -rn "Nuxt 3" layers/*/README.md` → 0; `grep -n "Nuxt UI Pro" layers/uix/README.md` → 0; `grep -rn "instead of ad hoc\|Used across server" layers/amplify/README.md AGENTS.md` → 0 |
| AC11 | App builds and existing e2e still pass | `pnpm saas:build` succeeds in an environment with a generated `amplify_outputs.json` (sandbox — CI-green is E01's exit); `pnpm saas:test:e2e:auth` and `saas:test:e2e:billing` pass against a sandbox |

## Dependencies and risks

- **E01 (green-ci)**: verification of AC11 in CI depends on E01; locally it needs a deployed sandbox.
  E03 must not introduce new typecheck errors (`pnpm --filter @starter-nuxt-amplify-saas/saas run typecheck`
  error count ≤ pre-epic baseline of 341).
- **E02 (fix-broken-wiring)** also lists "unauthenticated demo endpoints" as a lying surface. E03 is
  the owner of their **deletion**; E02 should not double-fix. Coordinate if executed concurrently
  (same files: `apps/saas/server/api/*`).
- **Shell regression risk**: the shell move changes the default layout for every page. Mitigation:
  the moved layout is a verbatim port (same components, same config keys), phase-gated smoke tests
  (plan Phase C), and e2e auth/billing specs exercise `/auth/login` and `/settings/billing` through
  the shell.
- **Layer publishability**: after the move, `layers/saas` must not import anything from `apps/saas`
  (it doesn't today; the moved layout's dependencies — `WorkspaceSwitcher`, `UserMenu`, `@nuxt/ui`
  dashboard components — all resolve within the layer graph: `layers/saas` extends
  `@mmshark/workspaces-layer` and `@mmshark/uix-layer`, which registers `@nuxt/ui` v4 where the
  dashboard components are MIT).
