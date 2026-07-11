# Product Roadmap — starter-nuxt-amplify-saas

> **Status**: Active · **Reset**: 2026-07-11 · **Source**: verified code, PRDs, audit and technical-debt ledger

This is the sequencing source of truth. It uses **Now / Next / Later** because only the immediate
work is a commitment; later ordering is a hypothesis that must be reviewed at every phase boundary.
Epics describe outcomes, not release dates.

## Product outcome

A developer can fork the repository, describe a SaaS product once, provision it on AWS Amplify,
enable Stripe billing and begin product-specific work without editing reusable layer internals.
The resulting starter must be honest: every visible and documented capability works end-to-end.

## Planning rules

- Lifecycle: `defined → specified → in progress → done`; `done` requires verified acceptance criteria.
- An imminent epic has `spec.md`, `design.md`, `plan.md` and `tasks.md` under `.context/epic/`.
- `Now` is committed and dependency ordered. `Next` is high confidence but may be reordered.
  `Later` is directional and requires discovery before implementation.
- Completed work stays in the completion register, not mixed into the active queue.
- At each phase boundary, rerun the feature audit and reconcile `.context/architecture/tech-debt.md`.

## Roadmap at a glance

| Horizon | Phase | Intended result | Epics |
|---|---|---|---|
| **Now** | 1. Product configuration contract | One validated `saas.config.ts` defines stable product facts without secrets or presentation details. | E26 |
| **Now** | 2. Configuration adoption | SaaS, landing and backend consume projections of the same manifest; duplicated catalogs disappear. | E27 |
| **Now** | 3. Repeatable initialization | A fork is initialized and verified through one documented Taskfile workflow. | E28 |
| **Next** | 4. Complete core loops | Invitations, entitlements, account management and workspace lifecycle work end-to-end. | E04, E06–E08 |
| **Next** | 5. Commercial readiness | The starter can be marketed, operated, tested and secured as a real product foundation. | E09–E15, E24 |
| **Later** | 6. Differentiation and scale | Optional capabilities add leverage after the core starter is trustworthy. | E16–E25 |

## Now — make the starter instantiable

### Phase 1 — Product configuration contract

**Outcome:** one typed, runtime-validated manifest distinguishes product facts from application
presentation and environment secrets.

| Epic | Status | Effort | Result |
|---|---|---:|---|
| [E26 — saas-config-contract](../epic/20260711-saas-config-contract/) | specified | M | Root `@mmshark/saas-config` package, `defineSaasConfig()`, schema, canonical `saas.config.ts`, tests and contract documentation. |

**Exit criteria:** invalid manifests fail with actionable paths; secrets are structurally excluded;
the package is importable from frontend and backend workspaces; no existing runtime consumer changes.

### Phase 2 — Configuration adoption

**Outcome:** every deployable app derives its product facts from the manifest while keeping UI-only
composition in `app.config.ts` and environment values in runtime config/secrets.

| Epic | Status | Effort | Result |
|---|---|---:|---|
| [E27 — saas-config-adapters](../epic/20260711-saas-config-adapters/) | specified | L | Typed projections for app config, landing, i18n, entitlements and backend plan/auth seed inputs; legacy duplicate sources removed. |

**Depends on:** E26. **Exit criteria:** changing a product fact in `saas.config.ts` updates every
intended consumer; apps retain explicit navigation/presentation overrides; CI detects projection drift.

### Phase 3 — Repeatable project initialization

**Outcome:** adopters can create a named SaaS instance through a safe, repeatable command and a short
runbook instead of repository-wide search-and-replace.

| Epic | Status | Effort | Result |
|---|---|---:|---|
| [E28 — saas-project-initializer](../epic/20260711-saas-project-initializer/) | specified | M | `task init` workflow for manifest creation, package/app identifiers, env scaffold and validation, plus updated make-it-yours documentation. |

**Depends on:** E26 and E27. **Exit criteria:** a clean clone can be initialized twice safely,
passes offline CI and reports remaining operator-owned AWS/Stripe steps without touching `layers/*`.

## Next — complete and harden the product promise

### Phase 4 — Complete core loops

| Epic | Status | Effort | Outcome |
|---|---|---:|---|
| [E04 — transactional-email](../epic/20260708-transactional-email/) | specified | M | Invitation delivery and acceptance, revocation and branded Cognito emails. |
| E06 — entitlements-wiring | defined | S | Real product surfaces consume plan/permission gates and lead to the plans page. |
| E07 — account-management | defined | M | Password change, verified email change, account deletion and avatar storage work safely. |
| E08 — workspace-lifecycle | defined | M | Ownership transfer, deletion, pending invitations and membership UX are complete. |

**Sequence:** E04 can run independently; E06 follows E27's catalog projection; E07 and E08 can run
after their security/data designs are specified. The phase exits when signup → invite → upgrade →
manage account/workspace has no dead ends.

### Phase 5 — Commercial readiness

| Epic | Effort | Outcome / dependency |
|---|---:|---|
| E09 — landing-site | L | Marketing, public pricing, legal and SEO; consumes E27. |
| E10 — observability | M | Client/server/Lambda errors, health endpoint, request IDs and coherent logging. |
| E11 — testing-hardening | L | API/Lambda/component coverage, fixed Playwright projects and a dependable E2E contract. |
| E12 — security-hardening | M | CSP/HSTS, origin/CSRF controls, rate limiting, audit-log MVP and GDPR operations. |
| E13 — i18n-adoption | M | Real translated UI and locale-aware formats; locale catalog comes from E27. |
| E14 — notifications | L | Persisted preferences and real in-app notifications. |
| E15 — onboarding | M | Persisted first-run journey with measurable activation. |
| E24 — auth-methods | M | MFA and selected social/OAuth providers; policy source comes from E27. |

This phase is high confidence in scope but not committed in exact order. E10–E12 are prerequisites
for calling the starter production-ready; E09 and E13–E15 can be sequenced by adoption feedback.

## Later — differentiation and scale

| Epic | Effort | Direction |
|---|---:|---|
| E16 — ai-module | L | Optional Bedrock/Amplify AI layer with usage-metering hooks. |
| E17 — background-jobs | M | Cleanup, reconciliation and reliable asynchronous work. |
| E18 — admin-panel | XL | Explicit platform-operator model and cross-tenant operations. |
| E19 — analytics | M | Product analytics and consent-aware event collection. |
| E20 — support-feedback | M | Support and feedback surfaces tied to identity and plan. |
| E21 — email-marketing | M | Consent-aware lifecycle audience synchronization. |
| E22 — feature-flags | S | Runtime targeting independent of subscription plans. |
| E23 — realtime | S | AppSync-driven live updates and post-checkout refresh. |
| E25 — major-upgrades-spike | S | Evidence-led framework/tooling major upgrades. |

These are not commitments. Each needs a hypothesis, metric and current-code review before promotion.

## Completion register

| Epic | Completed | Verified result |
|---|---|---|
| [E01 — green-ci](../epic/20260708-green-ci/) | 2026-07-08 | CI contract, offline outputs stub, typecheck/tests/builds green. |
| [E02 — fix-broken-wiring](../epic/20260708-fix-broken-wiring/) | 2026-07-08 | Critical integration wiring and misleading dead ends corrected or disabled. |
| [E03 — template-cleanup](../epic/20260708-template-cleanup/) | 2026-07-09 | One layer-owned shell; mock pages/endpoints and template residue removed. |
| [E05 — pricing-upgrade-flow](../epic/20260708-pricing-upgrade-flow/) | 2026-07-11 | Free→paid Stripe Checkout, trials, plans UI and webhook refresh verified end-to-end. |

## Risks and explicit non-goals

- AWS Amplify and Stripe are deliberate platform dependencies; non-AWS/self-hosted portability is
  not a goal.
- App configuration is client-visible. Secrets and environment-specific identifiers must remain in
  environment variables, Nuxt runtime config or Amplify secrets.
- Plan marketing data, entitlement semantics and Stripe identifiers have different consumers; E26
  defines one contract, while E27 must preserve trust boundaries in its projections.
- Mobile/desktop packaging and business-domain modules are outside this starter's scope.
