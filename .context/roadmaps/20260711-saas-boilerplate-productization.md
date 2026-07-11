---
id: 20260711-saas-boilerplate-productization
title: SaaS boilerplate productization
status: active
created: 2026-07-11
related:
  - .context/prd/current.md
  - .context/architecture/overview.md
  - .context/architecture/tech-debt.md
---

# SaaS boilerplate productization

## Outcome

A developer can fork the repository, describe a SaaS product once, provision it on AWS Amplify,
enable Stripe billing and begin product-specific work without editing reusable layer internals. Every
visible and documented capability works end-to-end.

## Current state

Authentication, multi-tenant workspaces, the dashboard shell and free-to-paid Stripe billing are
operational. Product facts are duplicated across app config, domain catalogs and provider fixtures;
initialization is still a manual repository-wide procedure. The horizons below express confidence,
not delivery dates: **Now** is committed, **Next** is expected but reorderable, and **Later** is
directional.

## Success criteria

- One validated, non-secret manifest owns stable product facts.
- SaaS, landing and backend consume explicit projections without leaking secrets or UI composition.
- A clean clone can be initialized repeatably through the Taskfile contract.
- Signup → invite → upgrade → account/workspace management has no dead ends.
- Offline CI, security, observability and operational documentation support a production deployment.

## Foundation already delivered

### Phase: Verified foundation

`phase: verified-foundation`

#### Outcome

The repository has a truthful, buildable baseline with one dashboard shell and a verified revenue
path.

#### Completion criteria

- Offline CI passes without AWS credentials.
- Critical wiring defects and misleading template surfaces are removed.
- A free workspace can complete the Stripe upgrade flow end-to-end.

#### Epics

- [E01 — Green CI](../epics/20260708-green-ci/spec.md)
- [E02 — Fix broken wiring](../epics/20260708-fix-broken-wiring/spec.md)
- [E03 — Template cleanup](../epics/20260708-template-cleanup/spec.md)
- [E05 — Pricing upgrade flow](../epics/20260708-pricing-upgrade-flow/spec.md)

## Now — make the starter instantiable

### Phase: Product configuration contract

`phase: product-configuration-contract`

#### Outcome

One typed, runtime-validated manifest distinguishes product facts from application presentation and
environment secrets.

#### Completion criteria

- Invalid manifests fail with actionable property paths.
- Secrets and provider resource identifiers are structurally excluded.
- The package is importable from frontend and backend workspaces.
- Existing application behavior is unchanged until adapters are delivered.

#### Epics

- [E26 — SaaS configuration contract](../epics/20260711-saas-config-contract/spec.md)

### Phase: Configuration adoption

`phase: configuration-adoption`

#### Outcome

Every deployable app derives product facts from the manifest while UI composition remains in
`app.config.ts` and environment values remain in runtime config or secrets.

#### Completion criteria

- Changing a product fact updates every intended consumer.
- Navigation and other presentation arrays remain explicitly app-owned.
- CI detects projection drift and duplicated catalogs are removed.

#### Epics

- [E27 — SaaS configuration adapters](../epics/20260711-saas-config-adapters/spec.md)

**Dependency:** E27 depends on E26.

### Phase: Repeatable project initialization

`phase: repeatable-project-initialization`

#### Outcome

Adopters can create a named SaaS instance through a safe, repeatable command and a short runbook.

#### Completion criteria

- A clean clone can be initialized twice safely.
- The initialized repository passes offline CI.
- Remaining AWS and Stripe operator steps are reported explicitly.
- Reusable `layers/*` source is not rewritten.

#### Epics

- [E28 — SaaS project initializer](../epics/20260711-saas-project-initializer/spec.md)

**Dependencies:** E28 depends on E26 and E27.

## Next — complete and harden the product promise

### Phase: Complete core loops

`phase: complete-core-loops`

#### Outcome

Signup, invitation, authorization, account management and workspace management form one complete
customer journey without placeholder controls or dead ends.

#### Completion criteria

- Invitations are delivered and can be accepted, declined and revoked.
- Real product surfaces enforce plan and permission gates.
- Account and workspace ownership lifecycle operations are safe and complete.

#### Epics

- [E04 — Transactional email](../epics/20260708-transactional-email/spec.md)

Candidate deliveries that require their own dated epic artifacts before execution: E06
entitlements wiring, E07 account management and E08 workspace lifecycle.

### Phase: Commercial readiness

`phase: commercial-readiness`

#### Outcome

The starter can be marketed, deployed, observed, tested and secured as a credible product
foundation.

#### Completion criteria

- Landing, pricing, legal and SEO surfaces are real and consume the product manifest.
- Production errors and critical flows are observable and tested.
- Security controls and operational procedures have verified evidence.
- Internationalization, notifications and onboarding no longer claim unbuilt behavior.

#### Epics

Candidate deliveries requiring specification before execution: E09 landing site, E10 observability,
E11 testing hardening, E12 security hardening, E13 i18n adoption, E14 notifications, E15 onboarding
and E24 authentication methods.

## Later — differentiation and scale

### Phase: Differentiation and scale

`phase: differentiation-and-scale`

#### Outcome

Optional modules add product leverage only after the core starter is trustworthy and measurable.

#### Completion criteria

- Each candidate has a validated user hypothesis and success measure.
- Shared infrastructure is introduced only when at least one real module needs it.
- Optional modules do not weaken the starter's default security or operational baseline.

#### Epics

Directional candidates, not yet epic artifacts: E16 AI module, E17 background jobs, E18 admin panel,
E19 analytics, E20 support/feedback, E21 email marketing, E22 feature flags, E23 realtime and E25
major-upgrades spike.

## Constraints, risks and exclusions

- AWS Amplify and Stripe are deliberate platform dependencies; non-AWS hosting is excluded.
- Client-visible configuration must never contain secrets or environment-specific resource IDs.
- Plan marketing facts, entitlement semantics and Stripe identifiers have different trust boundaries;
  projections must preserve them.
- Next/Later ordering is reviewed at every phase boundary against the feature audit and tech-debt
  ledger; it is not a release-date commitment.
- Mobile/desktop packaging and business-domain modules are outside this roadmap.
