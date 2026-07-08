# Product Roadmap — starter-nuxt-amplify-saas

> **Status**: Active — single source of truth for development sequencing.
> **Created**: 2026-07-08
> **Source**: every claim about current state is backed by the verified feature audit
> ([audits/reports/saas-starter-features-2026-07-08.md](../audits/reports/saas-starter-features-2026-07-08.md)),
> not by older documentation.

---

## How this roadmap is structured (and why)

This is a **single roadmap organized by phases**, not one roadmap per feature. Rationale:

- The 26 audited feature areas are at wildly different maturity levels (from 4★ DX to entirely absent
  areas), and the real blockers are **cross-feature**: transactional email blocks workspace invitations,
  file storage blocks avatars, entitlements wiring blocks monetization UX. Per-feature roadmaps would
  hide these dependencies.
- Phases encode an explicit dependency order — *make what exists true* → *close the core loops* →
  *reach commercial parity* → *differentiate*. Each phase has exit criteria; a phase is done when its
  exit criteria hold, not when its epics are merged.

Each phase is composed of **epics** — independent units of development per the
`repository-context-directory` org pattern. Every epic is defined in this file. Epics in the
**current phase** additionally have a directory under [`.context/epic/YYYYMMDD-<slug>/`](../epic/)
with at least `spec.md` (what + acceptance criteria) and `plan.md` (how, in phases); Phase 0 epics
also carry `tasks.md` (dependency-ordered work queue). Directories for later epics are created when
their phase approaches — their PRD-level definition lives here and, where deeper material exists, in
a per-domain PRD under [`prd/`](./).

**Lifecycle**: an epic moves `defined → specified (dir created) → in progress → done (spec criteria verified)`.
When an epic finishes, update its status here and record notable outcomes in `changelogs/` if warranted.

---

## Current state at a glance (audit 2026-07-08)

| Area | Impl. | Quality | Area | Impl. | Quality |
|---|---|---|---|---|---|
| Authentication | 3/5 | 4/5 | Notifications (in-app) | 2/5 | 2/5 |
| Multi-tenancy / Workspaces | 3/5 | 4/5 | Onboarding | 2/5 | 2/5 |
| Billing (Stripe) | 3/5 | 4/5 | File storage | 2/5 | 1/5 |
| Entitlements / RBAC | 3/5 | 3/5 | Feature flags | 2/5 | 2/5 |
| Security & compliance | 3/5 | 4/5 | Admin panel | 1/5 | — |
| Internal API layer | 3/5 | 3/5 | Analytics | 1/5 | — |
| UI kit / theming | 3/5 | 3/5 | Transactional email | 1/5 | 1/5 |
| DX / docs / tooling | 4/5 | 3/5 | AI / LLM module | 1/5 | — |
| Profile & account | 2/5 | 3/5 | Background jobs | 1/5 | — |
| i18n | 2/5 | 3/5 | Realtime | 1/5 | — |
| Landing / marketing | 2/5 | 1/5 | Customer support | 1/5 | — |
| Testing | 2/5 | 3/5 | Email marketing | 1/5 | — |
| CI/CD | 2/5 | 2/5 | Observability | 2/5 | 2/5 |

**Reading**: the backend core (tenancy model, billing engine, auth) is solid and above-average for a
starter. The recurring failure mode is the **last mile**: infrastructure that nothing consumes
(entitlements UI, i18n, logger), flows broken end-to-end (invitations, free→paid upgrade, email
change), and Nuxt UI template residue that fakes functionality. Phase 0 exists because building new
features on top of silently-broken wiring compounds the problem.

---

## Phase 0 — Stabilize: make what exists true

**Goal**: a fresh clone installs, builds, passes CI, and contains no UI that pretends to work.
Every documented capability either works or is explicitly marked future.

**Exit criteria**:
- CI runs on `master` and is green (install, lint, typecheck, unit tests, builds).
- The 10 verified integration bugs from the audit report are fixed.
- No template residue: no Nuxt UI Pro links, no mock-fed pages presented as product, one dashboard shell.

| Epic | Slug | Docs | Effort | Status |
|---|---|---|---|---|
| E01 | [20260708-green-ci](../epic/20260708-green-ci/) | spec, plan, tasks | M | **done** (2026-07-08) |
| E02 | [20260708-fix-broken-wiring](../epic/20260708-fix-broken-wiring/) | spec, plan, tasks | M | specified |
| E03 | [20260708-template-cleanup](../epic/20260708-template-cleanup/) | spec, plan, tasks | M | specified |

### E01 — green-ci
Make CI executable and green on `master`: generate/stub `amplify_outputs.json` in CI (or decouple the
static import), burn down the typecheck debt (341 errors, ~12 real), align lint with the supported
Node range, and merge `ci.yml` (currently only on a local branch). Depends on: nothing. Blocks: everything —
no other epic can claim "verified" without it.

### E02 — fix-broken-wiring
Fix the verified integration bugs: workspace cookie name mismatch (`current-workspace-id` vs
`currentWorkspaceId`), client subscription never hydrated (plan always resolves `free`), broken
redirect targets (`/upgrade`, `/pricing`, `/dashboard`, checkout `cancel_url`), email change without
attribute verification, ghost forms (password change / delete account with no handler), unauthenticated
demo endpoints, seeder never creating subscriptions, broken seed script path, `/debug` plans page.
Where the real fix belongs to a later epic (e.g. full account management), the Phase 0 fix is to
disable/remove the lying surface, not to build the feature.

### E03 — template-cleanup
Remove Nuxt UI dashboard template residue: footer/user-menu links to Nuxt UI Pro repos, mock-fed
pages (`customers`, `inbox`, home charts with `Math.random()`), `i.pravatar.cc`/`ui-avatars.com`
external avatars, decorative cookie-consent banner, duplicated shell (`layers/saas` vs `apps/saas` —
pick one, delete the other), and kill documentation drift at the source (uix README documents Nuxt UI
Pro APIs; amplify README claims logger adoption that doesn't exist).

---

## Phase 1 — Complete the core loops

**Goal**: the promise of the starter works end-to-end: *sign up → invite a teammate → upgrade to
paid → manage account* with no dead ends, entirely self-service.

**Exit criteria**:
- A workspace invitation reaches the invitee by email and can be accepted from the link.
- A free workspace can upgrade to a paid plan from inside the app (and from the public pricing page).
- Feature/permission gating actually gates UI and routes, driven by the real subscription.
- Password change, account deletion, avatar upload and verified email change all work.

| Epic | Slug | Docs | Effort | Status |
|---|---|---|---|---|
| E04 | [20260708-transactional-email](../epic/20260708-transactional-email/) | spec, plan | M | specified |
| E05 | [20260708-pricing-upgrade-flow](../epic/20260708-pricing-upgrade-flow/) | spec, plan | M | specified |
| E06 | entitlements-wiring | — (defined here) | S | defined |
| E07 | account-management | — (defined here) | M | defined |
| E08 | workspace-lifecycle | — (defined here) | M | defined |

### E04 — transactional-email
Introduce an email capability (provider adapter — SES via Amplify or Resend — behind a server util),
send workspace invitation emails with an acceptance link, build the acceptance/decline page, add
pending-invitation revocation UI, and brand the Cognito verification/reset emails (CustomMessage
trigger or SES config). Unblocks the invitation flow, which is currently unusable end-to-end.

### E05 — pricing-upgrade-flow
Mount the existing (currently dead) pricing components on a real page, wire checkout from a free
workspace (portal cannot start a first subscription), fix `cancel_url`, add basic trial support
(`trial_period_days` + remaining-days UI), and connect the landing pricing table to the public
`SubscriptionPlan` read. This epic is the revenue path; it front-runs the full landing build (E09).

### E06 — entitlements-wiring
Consume the entitlements layer in the product: gate real pages/components with `FeatureGate`/
`PermissionGuard`/route middlewares, create the `/upgrade` destination, replace ad-hoc role checks in
settings pages, and remove or wire the dead `enabled` catalog field. Depends on E02 (subscription
hydration, cookie fix).

### E07 — account-management
Complete the account surface: authenticated password change (`updatePassword`), self-service account
deletion (Cognito `deleteUser` + cleanup Lambda for personal workspace, groups, Stripe customer),
avatar upload (requires adding the missing Amplify Storage resource + upload UI), and a correct
verified email-change flow (`sendUserAttributeVerificationCode`/`confirmUserAttribute`) — or explicit
removal of email editing. Supersedes the Phase 0 stopgaps from E02.

### E08 — workspace-lifecycle
Round out workspace management: ownership transfer (endpoint + UI), workspace deletion UI (endpoint
exists, no consumer), invitation revocation, "my pending invitations" view for invitees, and member
list polish (avatars without external services). Depends on E04 for the invitation UX.

---

## Phase 2 — Commercial-grade starter

**Goal**: parity with commercial starters (Makerkit, Supastarter) on table stakes: a real marketing
site, observability, meaningful test coverage, security hardening, i18n actually used, notifications
and onboarding.

**Exit criteria**:
- Landing site sells the product (pricing, legal, SEO) and builds statically in CI.
- Errors in production are captured and visible (client + server + Lambdas); health endpoint exists.
- Unit tests cover the API routes and Lambdas; e2e suite runs green against a sandbox; coverage is measured.
- Security headers, rate limiting and CSRF protection are in place; notifications and onboarding are real features.

| Epic | Slug | Effort | Notes |
|---|---|---|---|
| E09 | landing-site | L | Home, features, pricing (public plans), legal pages, SEO/sitemap/OG, contact or waitlist. Fix `generate` on clean checkout. |
| E10 | observability | M | Sentry (nuxt module + Lambdas), `error.vue` + global hooks, `/api/health`, adopt `createLogger` everywhere or delete it, request IDs. |
| E11 | testing-hardening | L | Unit tests for 22 API routes + 3 Lambdas, component tests, coverage gate in CI, fix Playwright `individual` project + duplicate journey run. |
| E12 | security-hardening | M | nuxt-security (CSP/HSTS), rate limiting, CSRF/origin checks on mutating routes, audit-log MVP (the `audit-logs` entitlement is already sold), GDPR export/delete. |
| E13 | i18n-adoption | M | Sweep hardcoded strings to `$t()`, language switcher, locale-aware date/currency formatting, per-layer message conventions. |
| E14 | notifications | L | Real model + authenticated API + bell/badge + preferences persistence; PRD: [prd/notifications.md](./notifications.md). Pairs with E23 (realtime delivery). |
| E15 | onboarding | M | Wizard + progress persistence (UserProfile fields + write path) + redirect middleware; PRD: [prd/onboarding.md](./onboarding.md). |
| E24 | auth-methods | M | MFA/TOTP, social login (Google/GitHub via Cognito `externalProviders` + OAuth callback), optional magic-link/email-OTP sign-in. Closes the audit's authentication gaps no other epic covers (the 2026-07 remediation deliberately removed dead v5 MFA code and deferred this). |

---

## Phase 3 — Differentiators

**Goal**: capabilities that make the starter stand out in 2026 rather than merely complete.

| Epic | Slug | Effort | Notes |
|---|---|---|---|
| E16 | ai-module | L | Amplify AI Kit (`a.conversation()`/`a.generation()` on Bedrock), `layers/ai`, streaming chat UI on @nuxt/ui chat components, usage metering hooks for billing. |
| E17 | background-jobs | M | Scheduled Amplify functions (invitation cleanup, `ProcessedStripeEvent` purge/TTL, Stripe reconciliation sync), queue pattern for async work. |
| E18 | admin-panel | XL | Platform-operator role (global Cognito group), cross-tenant user/workspace management, impersonation, subscription overview. |
| E19 | analytics | M | PostHog (or Plausible) integration, event tracking from reliable server points (post-confirmation, stripe-webhook), real consent wiring. |
| E20 | support-feedback | M | Chat widget (Crisp/Intercom) with user/plan identification, in-app feedback endpoint, help/changelog pages. Honors the already-sold `priority-support` entitlement. |
| E21 | email-marketing | M | Audience sync on signup/upgrade/churn, newsletter capture on landing (depends E09), consent + unsubscribe honoring real preferences (depends E14). |
| E22 | feature-flags | S | Runtime flags independent of plans, targeting by user/workspace, admin toggle UI (depends E18 or a config-based fallback). |
| E23 | realtime | S | `useRealtime` composable over AppSync `observeQuery` (group-based auth already compatible), live notification delivery, post-checkout subscription refresh. |
| E25 | major-upgrades-spike | S | The majors deliberately deferred by the 2026-07 remediation (TypeScript 6, vue-router 5; future Nuxt/Tailwind majors as they land): one spike per major, gated on green typecheck/build/tests. Keeps the deferral recorded instead of forgotten. |

---

## Out of scope (deliberately)

- **tRPC**: removed from the product; REST via Nitro routes is the standard (see [../patterns/api-server.md](../patterns/api-server.md)).
- **Mobile apps, desktop packaging**: not a goal of this starter.
- **Self-hosted / non-AWS portability**: the starter is intentionally Amplify-native.

## Maintenance rules

- Update epic status here when it changes; this file is the queue of record.
- New epics: add the definition here first, create `epic/YYYYMMDD-<slug>/` when work is imminent.
- Never let a document claim capability that code does not have — that failure mode is what Phase 0 cleans up. When in doubt, link the audit report.
- Re-run the feature audit (checklist in [audits/checklists/saas-starter-features.md](../audits/checklists/saas-starter-features.md)) at each phase boundary and store the dated report.
