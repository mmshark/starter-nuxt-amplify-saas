# E27 — Design

> **Status**: Specified · **Created**: 2026-07-11

## Adapter ownership

`config/adapters/` exports boundary-specific pure functions:

| Adapter | Output consumer |
|---|---|
| `toSaasAppConfig` | `apps/saas/app/app.config.ts` primitives/objects only |
| `toLandingConfig` | landing public metadata, legal URLs and brand |
| `toI18nConfig` | locale codes/default locale/currency |
| `toEntitlementsCatalog` | feature definitions and plan inclusion |
| `toBillingSeedCatalog` | provider-neutral products/prices metadata for backend seed tooling |
| `toAuthPolicy` | supported Cognito configuration declarations |

Navigation arrays remain imported and composed explicitly in app config per the mandatory pattern.
Secrets and deploy identifiers never enter adapter input or output.

## Migration strategy

Migrate one consumer at a time behind equivalence tests: app identity/brand → localization →
entitlements → billing fixture/seeder → auth. Delete the superseded source only after its projection is
used and tests prove equivalent behavior.

## Key decision

Do not generate committed TypeScript/JSON files. Consumers import deterministic adapters directly;
Stripe fixture tooling may materialize temporary provider input at execution time. This prevents
generated files from becoming another source of truth.
