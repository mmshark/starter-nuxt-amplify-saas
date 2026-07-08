# SaaS Starter Feature Audit Checklist

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new

Reusable checklist of the concrete capabilities a top-tier SaaS starter is expected to ship, organized into the 26 areas used by the 2026-07 full-codebase audit. Future audits run against this list and record a verdict per item. This document states **expectations only** — it deliberately carries no claims about what this repo currently implements. Current status lives in dated reports under `../reports/` (see [How to run this audit](#how-to-run-this-audit)).

**Verdicts**

| Verdict | Meaning |
|---|---|
| `PASS` | Capability verified **in code** (cite `file:line` evidence). Docs alone never justify a PASS. |
| `FAIL` | Absent, broken, or hollow — includes "infrastructure exists but nothing consumes it", "UI exists but handler does nothing", and "docs-only". |
| `EXCEPTION` | Deliberately out of scope for the product stage. Must cite a decision or roadmap entry ([../../prd/roadmap.md](../../prd/roadmap.md)). |

## Cross-cutting checks

Apply to **every** area in addition to its items (recurring failure modes from past audits):

- [ ] **X-01** — Docs match code: every capability claimed in READMEs, PRDs, and AGENTS.md is verifiable in source.
- [ ] **X-02** — No dead UI: every rendered form, button, and toggle has a working handler with a real effect.
- [ ] **X-03** — No misleading feedback: success toasts/messages appear only when the action actually happened (e.g. never "sent successfully" without a send).
- [ ] **X-04** — Navigation and redirect targets exist: no middleware, prompt, or provider URL pointing at a route that is not defined.
- [ ] **X-05** — Shipped infrastructure has consumers: components, composables, wrappers, and config catalogs exported as features are actually used somewhere.
- [ ] **X-06** — No template leftovers in production paths: no unauthenticated mock/demo endpoints, hardcoded fake data presented as real, or third-party placeholder assets/links.

## Areas

### Authentication (`auth`)

- [ ] **AUTH-01** — Email + password sign-up with email verification (including code resend).
- [ ] **AUTH-02** — Sign-in and sign-out fully wired into product UI.
- [ ] **AUTH-03** — Password reset (forgot password): request + confirm two-step flow with working handlers.
- [ ] **AUTH-04** — MFA (TOTP): enrollment, challenge (`confirmSignIn`-style flow), and OTP UI.
- [ ] **AUTH-05** — Social login (e.g. Google/GitHub) with OAuth external providers and callback handling.
- [ ] **AUTH-06** — Magic link or email-OTP sign-in.
- [ ] **AUTH-07** — SSR-safe session: universal user state; tokens never serialized into the SSR payload.
- [ ] **AUTH-08** — Token storage hardening: HttpOnly session cookies or an equivalent documented XSS mitigation for token-bearing cookies.
- [ ] **AUTH-09** — Route protection middleware (authenticated/guest) applied to product pages.
- [ ] **AUTH-10** — Post-signup provisioning (profile, tenant, billing customer) that is idempotent and fail-loud or compensated — a confirmed user can never silently lack provisioning.
- [ ] **AUTH-11** — Abuse protection beyond IdP defaults: threat protection/advanced security, CAPTCHA, or application rate limiting on auth endpoints.
- [ ] **AUTH-12** — E2E coverage of sign-up (with real email verification) and sign-in.

### User Profile & Account (`profile`)

- [ ] **PROF-01** — Profile editing (name attributes) persisted to the identity provider, with validation and change detection.
- [ ] **PROF-02** — Email change completes a verification flow (send code + confirm attribute) before the new address becomes the login identifier.
- [ ] **PROF-03** — Password change for an authenticated user from settings (distinct from forgot-password).
- [ ] **PROF-04** — Self-service account deletion with backend cleanup (personal tenant, tenant groups, billing customer).
- [ ] **PROF-05** — Avatar upload backed by real object storage, rendered consistently across the app.
- [ ] **PROF-06** — Settings/profile navigation structure where every subpage is functional (no stub forms).
- [ ] **PROF-07** — Test coverage (unit or E2E) of profile/account flows.

### Multi-tenancy / Workspaces / Teams (`workspaces`)

- [ ] **WS-01** — Multi-tenant data model: workspace, membership, invitation, and per-workspace subscription entities.
- [ ] **WS-02** — Tenant isolation enforced at the data layer: tenant tables read-only for clients; all writes via privileged backend functions that verify the caller's token and role per action.
- [ ] **WS-03** — Workspace CRUD: create, update, and delete with cascading cleanup (members, invitations, groups, billing).
- [ ] **WS-04** — Role model (OWNER/ADMIN/MEMBER) with server-side role checks on every mutating action.
- [ ] **WS-05** — Invitations end-to-end: expiring token, email delivery (or at minimum a copyable link), an acceptance page the invitee can reach, and a "my pending invitations" view.
- [ ] **WS-06** — Invitation management for admins: revoke pending invitations from the members UI.
- [ ] **WS-07** — Ownership transfer between members.
- [ ] **WS-08** — Member removal and self-service "leave workspace".
- [ ] **WS-09** — Workspace switcher with persisted selection; the persistence key is read identically on client and server (no cookie-name drift between layers).
- [ ] **WS-10** — Workspace avatars/branding without hard runtime dependency on external third-party services.
- [ ] **WS-11** — Invitation tokens treated as secrets: constant-time comparison, not exposed beyond roles that need them.
- [ ] **WS-12** — E2E coverage of create/invite/role-change flows.

### Authorization / RBAC / Feature Gating (`entitlements`)

- [ ] **ENT-01** — Declarative catalogs: features, permissions, roles, and plans (with plan inheritance).
- [ ] **ENT-02** — SSR-safe entitlements composable (plan, role, feature/permission/plan checks).
- [ ] **ENT-03** — UI guards (feature gate, permission guard, upgrade prompt) exist **and are consumed** by product pages.
- [ ] **ENT-04** — Route middleware for feature/permission/plan gating, wired to pages, with redirect targets that exist.
- [ ] **ENT-05** — Server-side enforcement (`requirePermission`/`requireFeature` equivalents) applied to every protected API route, including the implicit workspace-context path (not only explicit workspace-ID overrides).
- [ ] **ENT-06** — Client state hydration: workspace subscription/plan populated so client-side plan gating resolves the real plan, never a hardcoded default.
- [ ] **ENT-07** — Single source of truth for role gating: no ad-hoc role checks scattered in pages bypassing the entitlements layer.
- [ ] **ENT-08** — Unit tests for authorization guards (permission and feature paths).

### Billing & Subscriptions (`billing`)

- [ ] **BILL-01** — Checkout with server-side price lookup (client cannot inject price IDs), permission-gated, with tenant metadata for webhook correlation.
- [ ] **BILL-02** — Customer portal flows (plan change with proration, cancel, payment method update) with server-derived return URLs (no open redirect).
- [ ] **BILL-03** — Webhook handler: signature verification, event deduplication/idempotency, out-of-order event guards, subscription state sync to the tenant record.
- [ ] **BILL-04** — Plans sourced from the billing provider (seeded/synced), exposed via a public read path for pricing.
- [ ] **BILL-05** — Free→paid upgrade path works end-to-end: pricing UI mounted on a real route, checkout reachable from it, and all success/cancel URLs resolve.
- [ ] **BILL-06** — Trials: trial period configured at checkout plus remaining-days surfaced in UI (not just synced fields).
- [ ] **BILL-07** — Tax handling (e.g. automatic tax) enabled in checkout.
- [ ] **BILL-08** — Dunning: payment failures trigger user-visible handling (email/status/UI), not only a log line.
- [ ] **BILL-09** — Invoice history visible in the app.
- [ ] **BILL-10** — Billing customer provisioning is idempotent with safe rollback/retry semantics.
- [ ] **BILL-11** — Unit + E2E coverage of billing (plans API, subscription page, checkout guard path).

### Landing / Marketing Site (`landing`)

- [ ] **LAND-01** — Home page with hero, features, and CTA (not the framework default welcome screen).
- [ ] **LAND-02** — Pricing page consuming real plan data via the public read path.
- [ ] **LAND-03** — SEO: per-page meta, Open Graph/Twitter cards, canonical URLs, sitemap, og-image.
- [ ] **LAND-04** — Legal pages: privacy policy, terms, cookie policy.
- [ ] **LAND-05** — Blog or content section (content module) — or an explicit EXCEPTION.
- [ ] **LAND-06** — Contact or waitlist form backed by a real endpoint.
- [ ] **LAND-07** — Marketing layout (header/footer) with navigation into the app's signup.
- [ ] **LAND-08** — Static build (`generate`) succeeds on a clean checkout without a live backend; deploy config matches the intended rendering mode (SSG vs SSR compute).
- [ ] **LAND-09** — Consent-gated analytics on the marketing site.

### UI Kit / Design System / Theming (`uix`)

- [ ] **UIX-01** — Central theme tokens (typography, palette, dark-mode overrides) in a dedicated layer.
- [ ] **UIX-02** — Single application shell: one layout/header/sidebar/user-menu implementation — no duplicated or shadowed shells that must be maintained twice.
- [ ] **UIX-03** — Shared state components: empty, loading, and error states.
- [ ] **UIX-04** — Theme switching (light/dark and brand colors) persisted across sessions.
- [ ] **UIX-05** — Accessibility: aria labels, keyboard navigation, contrast — with automated a11y checks (e.g. axe) in the test suite.
- [ ] **UIX-06** — Layer README/API docs describe only components, composables, and config that exist.
- [ ] **UIX-07** — No template demo pages fed by hardcoded mock endpoints presented as product features.

### Internationalization (`i18n`)

- [ ] **I18N-01** — i18n module configured: locales, default locale, URL strategy, lazy loading, number/date formats.
- [ ] **I18N-02** — Per-layer locale files with verified key parity across languages.
- [ ] **I18N-03** — UI strings actually translated: components use `$t()`/`useI18n()`; no hardcoded display strings in navigation, menus, or feature components.
- [ ] **I18N-04** — Language switcher in the product UI with persisted preference.
- [ ] **I18N-05** — Locale-aware formatting: no hardcoded `'en-US'` in date/number/currency calls.
- [ ] **I18N-06** — Locale-aware routing: auth/route middleware handle prefixed locale routes correctly.

### Transactional Email (`emails`)

- [ ] **EML-01** — Email provider integration (SES/Resend/etc.) with credentials via runtime config — an actual sending capability in the codebase.
- [ ] **EML-02** — Branded auth emails: custom subject/body and own sender domain (not IdP defaults from a no-reply verification domain).
- [ ] **EML-03** — Workspace invitation emails are actually sent when an invitation is created.
- [ ] **EML-04** — Transactional templates for lifecycle events (welcome, billing receipts/failures).
- [ ] **EML-05** — Local/test story for email (sandbox capture or documented test mode).

### In-app Notifications (`notifications`)

- [ ] **NOTIF-01** — Persistent notification model with owner-scoped authorization.
- [ ] **NOTIF-02** — Authenticated notifications API: list, mark-as-read, mark-all, unread count.
- [ ] **NOTIF-03** — Notification center UI fed by real data (no mock endpoint, no always-on badge).
- [ ] **NOTIF-04** — Producers: domain events (invitations, billing changes) create notifications.
- [ ] **NOTIF-05** — Toast feedback for user actions across features.
- [ ] **NOTIF-06** — Notification preferences persisted server-side and honored (an authorized write path must exist for the profile/preferences record).

### User Onboarding (`onboarding`)

- [ ] **ONB-01** — Onboarding route with a config-driven multi-step wizard (steps, indicator, skip/resume).
- [ ] **ONB-02** — Progress persistence (e.g. `onboardingCompleted`/`currentStep` on the user profile) with a user-authorized mutation path.
- [ ] **ONB-03** — Middleware redirecting users with incomplete onboarding into the flow.
- [ ] **ONB-04** — Automatic post-signup provisioning (profile, personal workspace, billing) — fail-loud or compensated.
- [ ] **ONB-05** — Guided first-run experience: welcome/quick-actions home or guided empty states actually reachable in the shipped app.
- [ ] **ONB-06** — No orphaned onboarding artifacts (layouts, feature flags) shipped without consumers.

### Internal Admin Panel (`admin`)

- [ ] **ADM-01** — Platform-operator role (global staff group) distinct from tenant roles.
- [ ] **ADM-02** — Admin area/app gated by operator authorization middleware.
- [ ] **ADM-03** — User management: search, inspect, disable users via IdP admin APIs.
- [ ] **ADM-04** — Cross-tenant workspace listing and management.
- [ ] **ADM-05** — Operator-level subscription/customer overview.
- [ ] **ADM-06** — Impersonation with an audit trail — or an explicit EXCEPTION.
- [ ] **ADM-07** — Dev/debug tooling excluded from production composition (build-time exclusion, not only per-page runtime guards).

### Internal API Layer (`api`)

- [ ] **API-01** — Documented API pattern (auth wrappers, validation, error taxonomy) whose examples compile against the real signatures.
- [ ] **API-02** — Auth wrappers applied consistently to every non-public route.
- [ ] **API-03** — Uniform input validation: invalid input returns the documented 400 + error code, never a raw validation exception surfacing as 500.
- [ ] **API-04** — Consistent error response format with a documented code taxonomy actually used by handlers.
- [ ] **API-05** — Rate limiting on API routes.
- [ ] **API-06** — No unauthenticated demo/mock endpoints in any app's `server/api/`.
- [ ] **API-07** — Public API with client API keys (issuance/rotation, `/api/v1` surface) — or an explicit EXCEPTION.
- [ ] **API-08** — No dead server utilities exported as part of the pattern (every wrapper has consumers).

### File Storage (`storage`)

- [ ] **STOR-01** — Storage backend resource (bucket) defined in the backend with access rules and present in generated outputs.
- [ ] **STOR-02** — Upload + signed-URL retrieval work end-to-end from the client API surface.
- [ ] **STOR-03** — Server/SSR parity: the storage API is available where the types claim it is, or its client-only scope is explicit.
- [ ] **STOR-04** — At least one product feature consumes storage (e.g. avatar upload).
- [ ] **STOR-05** — Docs and type declarations expose no phantom storage APIs that fail at runtime.

### Product Analytics (`analytics`)

- [ ] **ANLT-01** — Provider integration (PostHog/Plausible/Amplitude/etc.) via an env-configured, SSR-safe client plugin.
- [ ] **ANLT-02** — `identify()` bound to the authenticated user on login.
- [ ] **ANLT-03** — Core business events tracked: signup, checkout started, subscription created/upgraded/canceled — server-side where reliability demands it (webhook, post-confirmation).
- [ ] **ANLT-04** — Pageview tracking wired to the router.
- [ ] **ANLT-05** — Analytics loading gated on real cookie consent.
- [ ] **ANLT-06** — No fake metrics: dashboards show real data or are clearly labeled demos; plan matrices only sell analytics features that exist.

### Feature Flags / Experiments (`flags`)

- [ ] **FLAG-01** — Runtime feature flags independent of billing plan (config-, model-, or provider-backed).
- [ ] **FLAG-02** — Kill-switch semantics enforced: a flag marked disabled is actually blocked everywhere (client and server), not a dead config field.
- [ ] **FLAG-03** — Targeting: per-user/per-workspace/percentage rollout — or an explicit EXCEPTION.
- [ ] **FLAG-04** — A/B experiment primitives (variants + measurement path) — or an explicit EXCEPTION.
- [ ] **FLAG-05** — An operator-facing way to toggle flags without redeploying.
- [ ] **FLAG-06** — Documentation clearly separates plan-based entitlements from runtime flags; future work is labeled as such.

### Observability (`observability`)

- [ ] **OBS-01** — Structured logging (levels, scope/context, machine-parseable) **adopted across server code and backend functions** — a logger utility with zero call sites does not pass.
- [ ] **OBS-02** — Error tracking for client and server (Sentry/equivalent) wired into the apps.
- [ ] **OBS-03** — Global error handling: `error.vue`/error boundaries and `app:error`/`vue:error` hooks.
- [ ] **OBS-04** — Health check endpoint (e.g. `/api/health`).
- [ ] **OBS-05** — Request correlation IDs propagated across the server layer and backend functions (or tracing via X-Ray/OpenTelemetry).
- [ ] **OBS-06** — Alerts/alarms on critical failures (webhook sync errors, 5xx rates), not just CloudWatch defaults.
- [ ] **OBS-07** — API error responses follow the documented error taxonomy (codes in `data.code`, not only status/statusMessage).

### Testing (`testing`)

- [ ] **TEST-01** — Unit test infrastructure with meaningful coverage of composables and server utilities (not a handful of token tests).
- [ ] **TEST-02** — Tests for API routes and backend functions (webhook, provisioning, membership handlers).
- [ ] **TEST-03** — Component tests using the framework's test utils (real auto-import behavior, not hand-stubbed globals).
- [ ] **TEST-04** — Coverage reporting with thresholds enforced in CI.
- [ ] **TEST-05** — E2E coverage of all critical flows: auth (signup/signin/password reset), billing, workspaces, entitlements.
- [ ] **TEST-06** — E2E suite is portable and internally consistent: infra prerequisites documented, project configs match spec locations, no specs silently skipped or executed twice.
- [ ] **TEST-07** — The full test suite runs green in CI.

### CI/CD & Deployment (`cicd`)

- [ ] **CI-01** — CI passes on a clean checkout: generated/ignored files (e.g. backend outputs) are stubbed or generated in the pipeline, never assumed.
- [ ] **CI-02** — Quality gates in CI: lint, typecheck (zero errors), tests, and builds of every app.
- [ ] **CI-03** — CI is actually enabled and running on the default branch (a workflow file with zero executions does not pass).
- [ ] **CI-04** — Preview environments for pull requests.
- [ ] **CI-05** — Deploy configuration matches each app's intended rendering mode (SSR compute vs static hosting).
- [ ] **CI-06** — Package publishing workflows (layers) verified functional.
- [ ] **CI-07** — Node/engine versions consistent across CI, docs, and tooling (declared engines actually work with the toolchain).

### Security & Compliance (`security`)

- [ ] **SEC-01** — Tenant isolation verified at the data layer: client roles are read-only on tenant tables; all writes go through privileged functions that re-verify caller identity and role.
- [ ] **SEC-02** — Secrets/tokens compared in constant time; invitation-style tokens scoped to the minimum audience.
- [ ] **SEC-03** — Security headers (CSP, HSTS, X-Frame-Options/frame-ancestors) configured for all apps.
- [ ] **SEC-04** — CSRF defense beyond `SameSite=Lax` for cookie-authenticated mutating routes (origin checks or tokens).
- [ ] **SEC-05** — Rate limiting/WAF on public entry points (auth, webhook function URL, public API).
- [ ] **SEC-06** — Audit log of sensitive actions (role changes, deletions, billing changes) — if sold as a plan feature, it must exist.
- [ ] **SEC-07** — GDPR basics: user data export and working account deletion.
- [ ] **SEC-08** — No unauthenticated endpoints returning data (including template leftovers).
- [ ] **SEC-09** — Webhook signature verification with idempotency and replay/ordering guards.
- [ ] **SEC-10** — Session token storage risk (JS-readable cookies) mitigated or explicitly documented as an accepted platform constraint.

### DX, Documentation & Tooling (`dx`)

- [ ] **DX-01** — Reproducible setup documentation: cloud credentials, sandbox, billing secrets, per-app deploy — a newcomer can follow it start to finish.
- [ ] **DX-02** — Contributor/agent guide (AGENTS.md) whose factual claims are verified against code.
- [ ] **DX-03** — Every package.json script resolves: no scripts pointing at missing files or directories.
- [ ] **DX-04** — Seed tooling produces the advertised fixtures end-to-end (including subscriptions/relations, not just base records).
- [ ] **DX-05** — Analysis/gap docs are either current or archived — no stale documents flagged as mandatory reading.
- [ ] **DX-06** — Code generators emit current configuration (no regeneration that would reintroduce obsolete dependencies).
- [ ] **DX-07** — Debug tooling works against the current config schema (no pages reading config keys nothing defines).

### AI / LLM Integration (`ai-integration`)

- [ ] **AI-01** — AI backend primitives (e.g. Amplify AI Kit `a.conversation()`/`a.generation()` on Bedrock, or a provider SDK) authorized through the existing tenancy model.
- [ ] **AI-02** — A dedicated AI layer: chat/conversation composable plus secure server routes following the repo's API pattern.
- [ ] **AI-03** — Streaming chat UI (reusing the UI kit's chat components).
- [ ] **AI-04** — Prompt management: versioned templates/system prompts per feature.
- [ ] **AI-05** — Usage metering (tokens/requests) with hooks into billing for usage-based pricing.
- [ ] **AI-06** — If the area is out of scope, it appears as an EXCEPTION with a roadmap entry — silence is a FAIL for a commercial starter in 2026.

### Background Jobs & Scheduled Tasks (`background-jobs`)

- [ ] **JOBS-01** — Scheduled function support with reference implementations (e.g. `defineFunction({ schedule })` in the backend).
- [ ] **JOBS-02** — Cleanup jobs or TTLs for unbounded tables: expired invitations, processed webhook-event dedupe records.
- [ ] **JOBS-03** — Periodic billing reconciliation against the provider to self-heal missed webhooks.
- [ ] **JOBS-04** — Queue infrastructure for async work (SQS/EventBridge or equivalent) with a documented pattern.
- [ ] **JOBS-05** — Retry/DLQ strategy for failed jobs; jobs designed idempotent.

### Customer Support & Feedback (`customer-support`)

- [ ] **SUP-01** — Support chat widget (Crisp/Intercom/Plain) configurable via env, loading with user identification and plan/workspace segmentation.
- [ ] **SUP-02** — In-app feedback / bug-report capture (auto-collecting route, workspace, version, user agent) posting to a real endpoint.
- [ ] **SUP-03** — Routing backend for feedback/support (email or helpdesk ticket creation).
- [ ] **SUP-04** — Help/support/feedback links point at product-owned destinations (no upstream template repos).
- [ ] **SUP-05** — Contact page or form reachable from the product.
- [ ] **SUP-06** — Support-related plan entitlements (e.g. "priority support") backed by an actual capability or removed from the plan matrix.

### Realtime / Live Updates (`realtime-updates`)

- [ ] **RT-01** — A documented realtime subscription pattern (client-only composable with `onUnmounted` cleanup and token-refresh resilience) over the data client's subscriptions.
- [ ] **RT-02** — Live in-app notifications delivery (bell updates without refresh).
- [ ] **RT-03** — Live workspace membership/role updates for affected members.
- [ ] **RT-04** — Live subscription/billing status updates post-checkout (webhook write surfaces to the client without manual refresh).
- [ ] **RT-05** — Authorization model for the direct client↔realtime path validated (group-based read rules hold for subscriptions).

### Email Marketing & Audience Sync (`email-marketing`)

- [ ] **MKT-01** — Provider abstraction (Resend Audiences/Loops/Mailchimp adapters) configurable via env vars.
- [ ] **MKT-02** — Newsletter capture on the marketing site with a validated subscribe endpoint and double opt-in.
- [ ] **MKT-03** — Audience sync on signup (post-confirmation) and tag updates on plan change/churn (billing webhook).
- [ ] **MKT-04** — Working unsubscribe and consent recording (GDPR/CAN-SPAM): marketing preferences persisted and actually honored.
- [ ] **MKT-05** — No fake audience/preference UI: preference toggles and customer lists must be backed by real data.

## How to run this audit

1. **Scope**: audit one area (a "domain") or run a full 26-area sweep. Use the area keys above (`auth`, `billing`, …) as domain names.
2. **Verify against code, not docs.** For each item, locate the implementation with grep/read and record `file:line` evidence. A capability described only in a README/PRD, an exported utility with no call sites, or a UI control with no handler is a `FAIL` (see the cross-cutting checks).
3. **Assign a verdict per item**: `PASS`, `FAIL`, or `EXCEPTION`. An `EXCEPTION` requires a written justification and a link to the decision or roadmap entry that defers it ([../../prd/roadmap.md](../../prd/roadmap.md)).
4. **Write the report** to `../reports/<domain>-<YYYY-MM-DD>.md` (e.g. `../reports/auth-2026-07-08.md`; use `saas-starter-features-<date>.md` for a full sweep). Each report should contain:
   - the standard header block (`Status: Active`, creation date, source = this checklist);
   - a verdict table: `| ID | Item | Verdict | Evidence (file:line) / Justification |`;
   - a findings section for anything discovered beyond the checklist (new risks, doc drift, dead code);
   - a summary line: counts of PASS/FAIL/EXCEPTION.
5. **Keep this checklist current**: when an audit reveals a recurring expectation this list misses, add the item here (with a new ID — never reuse retired IDs) in the same change that lands the report.
