# E26 — SaaS configuration contract

> **Status**: Specified · **Created**: 2026-07-11 · **Source**: roadmap reset

## Hypothesis and outcome

We believe that defining product facts once in a validated `saas.config.ts` will reduce fork setup
errors and configuration drift because adopters currently edit unrelated app, layer, fixture and
documentation files independently.

**Outcome:** a framework-neutral workspace package exports the canonical manifest, its inferred
types and `defineSaasConfig()`. E26 introduces the contract only; it does not migrate runtime
consumers (E27) or automate repository initialization (E28).

## Scope

The contract covers stable, non-secret product facts:

- product identity and public URLs;
- brand assets and Nuxt UI color names;
- supported/default locales and default currency;
- public plan catalog, marketing features, limits and optional trial days;
- entitlement feature identifiers and plan inclusion;
- authentication policy declarations (signup fields, enabled provider names, MFA policy);
- shell capability defaults.

It explicitly excludes secrets, AWS resource identifiers, Stripe price/customer IDs, deploy-stage
values, navigation arrays and other per-app presentation.

## Acceptance criteria

1. A root workspace package `@mmshark/saas-config` exposes `defineSaasConfig`, the schema and inferred
   public types through stable package exports.
2. Root `saas.config.ts` is the canonical valid example and contains no secret/env-specific values.
3. Validation rejects duplicate plan/feature IDs, an unknown default locale, invalid URLs, invalid
   Nuxt UI colors, negative limits/prices/trials and entitlement references to missing plans/features.
4. Error output contains actionable property paths and works at build time and in Node scripts.
5. The schema is framework-neutral: it imports neither Nuxt nor Amplify and is safe in frontend and
   backend workspaces.
6. Unit tests cover a valid manifest and every cross-field invariant.
7. `pnpm-workspace.yaml`, TypeScript/package exports and the lockfile include the package.
8. `task ci:all` passes. No application behavior changes in this epic.

## Success measure

A fresh contributor can find every supported product fact in one typed file, and invalid changes
fail before deployment with a precise path. E27 can consume the package without changing its API.

## Non-goals

- Reading `process.env` or storing secrets.
- Generating `app.config.ts`, Stripe fixtures or Amplify resources.
- Runtime remote configuration or feature-flag targeting.
- Repository/package renaming.

## Risks

- An overly broad contract becomes a second application framework. Keep only facts shared by two or
  more consumers or required to initialize a product.
- Cross-field Zod refinements can produce vague errors; every refinement must set an explicit path.
- Stripe amounts and display prices can diverge. E26 models business catalog intent; E27 owns the
  trusted provider projection and validation boundary.
