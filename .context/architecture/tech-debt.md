# Technical Debt Ledger

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new (compiled from the verified feature audit of 2026-07-08 — risk and verifier-correction findings across all 26 areas; supersedes drift notes scattered in `doc/analysis/`)

Every item below was verified against the code on 2026-07-08 (file/line citations checked). Items are
grouped by tier; within a tier, order is roughly by impact. The **Epic** column maps each item to the
epic in [../roadmaps/20260711-saas-boilerplate-productization.md](../roadmaps/20260711-saas-boilerplate-productization.md) that resolves it, or `unassigned` when no epic covers
it yet — unassigned items need either a fix on sight or a roadmap decision.

Maintenance: when an item is fixed, delete its row (git history is the archive). When an audit or
review finds new debt, add a row with verified file references. Do not add speculative items.

---

## Tier 1 — Security-relevant

Nothing here is a known-exploitable hole today (tenant isolation and server-side billing
authorization are solid), but each item weakens the security posture or widens blast radius.

| ID | Debt | Affected files | Epic |
|---|---|---|---|
| SEC-01 | All Cognito tokens (incl. refresh token) live in **non-HttpOnly cookies** readable from JS — inherent to the Amplify JS SSR adapter; any XSS exfiltrates the full session. Cookie opts set `sameSite: 'lax'` + `secure` but not `httpOnly` (the client SDK must read them). | `layers/amplify/plugins/01.amplify.server.ts` (cookieOpts L137), `layers/amplify/plugins/01.amplify.client.ts` | unassigned — inherent to Amplify JS SSR; E12 (CSP) shrinks the XSS vector |
| SEC-03 | **Post-confirmation trigger swallows all errors** ("Don't throw to prevent registration from failing"): a user can end up confirmed with no UserProfile, no personal workspace, no Stripe customer — no retry, no compensation, only a CloudWatch log line. | `apps/backend/amplify/auth/post-confirmation/handler.ts` (L129-133) | E10 (surface failures) + E17 (compensation/repair job) |
| SEC-04 | **No security headers, no CSRF tokens/Origin checks, no rate limiting** anywhere: cookie-authenticated mutating Nitro routes (billing, workspaces) rely solely on `SameSite=Lax`. | `apps/saas/nuxt.config.ts`, `apps/landing/nuxt.config.ts`, all `layers/*/server/api/**` mutating routes | E12 |
| SEC-05 | **Debug layer ships in the production composition**; its pages 404 only via a per-page `if (!import.meta.dev)` guard — one forgotten guard exposes session/attributes/billing state. | `apps/saas/nuxt.config.ts`, `layers/debug/pages/debug/index.vue` (L6), `plans.vue` (L8), `profile.vue` (L6) | unassigned — exclude the layer per environment |
| SEC-06 | **No verified email-change flow**: email editing is disabled in the account form (E02 stopgap — `readonly disabled`, no mutating submit), so no unverified address can become the `loginWith: email` identifier; a real verified change flow (`sendUserAttributeVerificationCode`/`confirmUserAttribute`) still does not exist. | `layers/auth/composables/useUser.ts` (`updateAttributes`), `apps/backend/amplify/auth/resource.ts` | E07 (verified flow) |
| SEC-07 | **Raw invitation token returned to OWNER/ADMIN** in the invitations list response (currently the *only* way an invitee can ever get the token, since no email is sent). | `layers/workspaces/server/api/workspaces/[id]/invitations.get.ts` (L66) | E04 — email delivery removes the need to expose it |

## Tier 2 — Functional bugs (verified broken wiring)

| ID | Debt | Affected files | Epic |
|---|---|---|---|
| BUG-04 | **No in-app password change / account deletion**: the security page's ghost password form and delete-account button were removed (E02 stopgap — the page now links to the working reset flow); real authenticated `updatePassword` and self-service account deletion (`deleteUser` + cleanup) still do not exist. | `layers/saas/pages/profile/security.vue`, `layers/auth/composables/useUser.ts` | E07 (real feature) |
| BUG-05 | **Workspace invitation flow unusable end-to-end and lies about it**: Lambda and modal report "Invitation sent successfully" but no email integration exists in the repo; no acceptance page consumes the accept/decline endpoints; no revocation UI despite backend support. | `apps/backend/amplify/functions/workspace-membership/handler.ts` (createInvitation), `layers/workspaces/components/InviteWorkspaceMemberModal.vue` (L81), `layers/workspaces/server/api/workspaces/[id]/invitations/` | E04 (email + accept page), E08 (revocation UI) |
| BUG-10 | **Landing deploy config contradicts SSG**: `apps/landing/amplify.yml` runs `build` (SSR compute) though CI/docs treat the app as SSG. (The clean-checkout `generate` break — layer tsconfigs referencing not-yet-generated `./.nuxt/tsconfig.*.json` — was resolved in E01 by dropping the dead project references.) | `apps/landing/amplify.yml` | E09 |
| BUG-11 | **Playwright `individual` project broken; duplicate journey run**: `testMatch: '**/layers/*.spec.js'` misses the nested `specs/layers/auth/`, `specs/layers/billing/`; a full run executes `flows/new-user-journey.spec.js` twice (26 executions for 18 tests). | `apps/saas/tests/e2e/playwright.config.js` (L42, L48) | E11 |
| BUG-12 | **ZodError surfaces as 500**: workspace mutations call `schema.parse()` raw, so invalid input returns a generic 500 instead of the documented `400 VALIDATION_ERROR` contract. | `layers/workspaces/server/api/workspaces/index.post.ts`, `[id]/index.put.ts`, `[id]/members/invite.post.ts`, `[id]/members/[userId]/role.patch.ts` | unassigned |
| BUG-13 | **Notification preferences silently discarded**: page holds local reactive state with a literal `// TODO: Implement notification preferences update` — a user's opt-out (incl. marketing) never persists. Persisting needs a write path: `UserProfile` is owner-read-only (only the post-confirmation Lambda writes). | `layers/saas/pages/profile/notifications.vue` (TODO L41), `apps/backend/amplify/data/resource.ts` (UserProfile auth) | E03 (remove stub) → E14 (real preferences) |
| BUG-17 | **Invoice payment-method info silently lost**: `getPaymentMethodInfo` reads `invoice.payment_intent`, removed from `Stripe.Invoice` in stripe-node v18 (API 2025-08-27.basil). At runtime the field is now `undefined`, so invoices always fall through to the no-card path (brand/last4/exp dropped); the object guard prevents a throw, so it degrades gracefully. Verified basil path: `invoice.payments[]` (InvoicePayment) → `payment_intent` → `latest_charge.payment_method_details.card`; the list `expand` at L82 (`data.payment_intent.latest_charge`) is also invalid under basil. A correct fix needs a live Stripe test account to confirm the expand shape / 4-level expand limit — a wrong expand string 400s the whole listing, so it is deferred rather than changed blind. | `layers/billing/server/api/billing/invoices.get.ts` (L82 expand, L151) | unassigned — fix on sight; needs a Stripe test account to verify |

## Tier 3 — Dead code & documentation drift

Infrastructure with zero consumers, template residue faking functionality, and docs claiming
capabilities the code does not have.

| ID | Debt | Affected files | Epic |
|---|---|---|---|
| DEAD-01 | `isProtectedRoute` is exported and used nowhere in the repo. | `layers/auth/utils/index.ts` (L8) | unassigned — delete on sight |
| DEAD-02 | `withFeature`/`withPermission` server wrappers have zero consumers (`requireFeature`/`requirePermission` are the used path). | `layers/entitlements/server/utils/withFeature.ts`, `withPermission.ts` | unassigned — delete or adopt |
| DEAD-04 | **`enabled` field of the FEATURES catalog is read by nothing** — a feature marked `enabled: false` stays fully accessible; misleading as a kill switch. | `layers/entitlements/config/features.ts` | E06 ("remove or wire the dead `enabled` field") |
| DEAD-05 | **`createLogger` has zero production consumers**; server routes and Lambdas still use ad-hoc `console.*`. Documentation now marks it honestly as available-but-unadopted. | `layers/amplify/utils/logger.ts`, server routes and Lambda handlers | E10 ("adopt everywhere or delete it") |
| DEAD-06 | **Entitlements UI layer entirely unconsumed**: no page/component in any app uses `FeatureGate`, `PermissionGuard`, `UpgradePrompt` or the `feature`/`permission`/`requirePlan` middlewares; settings pages do ad-hoc role checks instead. | `layers/entitlements/components/*`, `layers/entitlements/middleware/*`, `layers/saas/pages/settings/index.vue` (L7), `settings/workspaces.vue` (L47) | E06 |
| DEAD-07 | **i18n infrastructure unconsumed**: zero uses of `$t()`/`useI18n()`/`localePath`/`setLocale` in all of `layers/` and `apps/`; all UI strings hardcoded English; `/es/*` routes are generated but the code is locale-unaware; dates/currency hardcode `en-US`. | `layers/i18n/nuxt.config.ts` + locale JSON files, `layers/billing/components/InvoicesList.vue` (L212), `CurrentSubscription.vue` (L173) | E13 |
| DEAD-08 | **Orphan onboarding artifacts**: layout used by no page (zero `layout: 'onboarding'` hits) and a `saas.features.onboarding` flag read by no code. | `layers/saas/layouts/onboarding.vue`, `layers/saas/app.config.ts`, `layers/saas/types/saas-config.ts` | E27 removes decorative config; E15 builds onboarding |
| DEAD-09 | **`$Amplify.Storage` is a deceptive stub**: client plugin exposes `uploadData`/`getUrl` and the types/README document them (incl. on the server, where it is `undefined`), but no `amplify/storage/resource.ts` exists — any documented usage fails at runtime. | `layers/amplify/plugins/01.amplify.client.ts`, `layers/amplify/types/amplify.d.ts`, `layers/amplify/README.md`, `apps/backend/amplify/backend.ts` | E07 (adds the storage resource for avatars) |
| DEAD-12 | **Entitlements sold without product behind them**: the plan matrix sells `advanced-analytics`, `audit-logs` and `priority-support`; none exists as functionality. | `layers/entitlements/config/features.ts` | E19 (analytics), E12 (audit-log MVP), E20 (support) |
| DEAD-15 | **Decorative SaaS config keys**: `saas.theme.colors`, `features.multiWorkspace` and `features.onboarding` are defined and typed but have no runtime readers; actual Nuxt UI colors use `ui.colors`. | `layers/saas/app.config.ts`, `layers/saas/types/saas-config.ts` | E27 |

## Tier 4 — Fragility & operational risk

Works today, but degrades or breaks under time, load, or partial failure.

| ID | Debt | Affected files | Epic |
|---|---|---|---|
| FRAG-01 | **`ProcessedStripeEvent` grows unbounded**: no DynamoDB TTL, no purge job; likewise `WorkspaceInvitation` rows in PENDING/EXPIRED accumulate forever (expiry is only checked lazily on accept). | `apps/backend/amplify/data/resource.ts`, `apps/backend/amplify/functions/stripe-webhook/handler.ts` (L117, L153), `workspace-membership/handler.ts` (L570-573) | E17 (purge/TTL jobs) |
| FRAG-02 | **Webhook idempotency window**: the dedupe record is written *after* processing, without a transaction — a crash between subscription upsert and `ProcessedStripeEvent.create` can reprocess an event (acknowledged in handler comments; partially mitigated by the ordering guard). | `apps/backend/amplify/functions/stripe-webhook/handler.ts` (L117-153) | E17 (idempotency hardening + reconciliation) |
| FRAG-03 | **Ordering guard mixes clock domains**: compares Stripe `event.created` against DynamoDB `updatedAt` — a legitimate event created just before a local write can be dropped as stale. | `apps/backend/amplify/functions/stripe-webhook/handler.ts` (L206-213, L262-268) | E17 (ordering-guard hardening) |
| FRAG-04 | **No Stripe reconciliation**: a webhook lost beyond Stripe's retry window leaves subscription state permanently drifted; `invoice.payment_failed` is only logged (no dunning). | `apps/backend/amplify/functions/stripe-webhook/handler.ts` | E17 (periodic sync) |
| FRAG-05 | **Billing rollback assumption is wrong**: on write failure `ensureWorkspaceBilling` deletes the Stripe customer, but the retry comment assumes `idempotencyKey = workspaceId` will recreate it — Stripe idempotency replays the *original* (now-deleted) response. | `layers/billing/server/utils/ensureWorkspaceBilling.ts` (L61-99) | unassigned |
| FRAG-06 | **E2E suite requires live external services**: real Amplify sandbox + Cognito, a Stripe account, and Gmail IMAP (`GMAIL_APP_PASSWORD`) for email-code extraction; Stripe Portal DOM changes break specs — not portable for adopters. | `apps/saas/tests/e2e/` (esp. `helpers/auth.js`) | E11 |
| FRAG-07 | **Unit tests hand-stub Nuxt auto-imports on `globalThis`** instead of using `@nuxt/test-utils` — can silently diverge from real Nuxt behavior; no coverage tooling or threshold exists. | `layers/workspaces/composables/__tests__/useWorkspaces.test.ts`, `vitest.config.ts` | E11 |
| FRAG-08 | **No observability**: no error tracking (client, server, or Lambdas), no `error.vue`/global error hooks, no `/api/health`, no request IDs, unstructured `console.*` logging in ~30 files — production failures (incl. billing-sync errors) are invisible. | `apps/saas/nuxt.config.ts`, `apps/backend/amplify/functions/*/handler.ts` | E10 |
| FRAG-09 | **`invoices.get.ts` does not bound its `limit` param** (and billing routes validate by hand with `typeof` instead of the Zod pattern). | `layers/billing/server/api/billing/invoices.get.ts`, `checkout.post.ts`, `portal.post.ts` | unassigned |

---

## Reading the ledger against the roadmap

- Completed E01–E03 and E05 rows have been removed when verified; git history is the archive.
- **Now** E26–E28 remove configuration duplication/decorative keys and make forks repeatable.
- **Next** E04/E06–E15/E24 close core loops and absorb the structural security/testing/operations debt.
- **Later** E17 absorbs billing/event lifecycle fragility after observability and test foundations exist.
- Seven items are **unassigned** (SEC-01/05, BUG-12, DEAD-01/02, FRAG-05/09): small enough to fix opportunistically, but they must not be silently forgotten — reassess at each phase boundary alongside the audit re-run.
