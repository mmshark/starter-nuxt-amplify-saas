# E26 — Design

> **Status**: Specified · **Created**: 2026-07-11

## Decision

Create a root workspace package at `config/` named `@mmshark/saas-config`:

```text
config/
├── package.json
├── index.ts
├── schema.ts
├── types.ts
└── __tests__/schema.test.ts
saas.config.ts
```

`schema.ts` owns leaf schemas and cross-field validation. `defineSaasConfig(input)` parses and
returns a deeply typed value; `saas.config.ts` calls it and exports the result. Package exports expose
`.` plus `./schema` and `./types` without coupling consumers to file paths.

## Contract shape

```ts
{
  product: { id, name, description, urls: { app, landing, support?, privacy?, terms? } },
  brand: { logo, favicon, colors: { primary, neutral } },
  localization: { defaultLocale, locales, defaultCurrency },
  billing: { plans: [{ id, name, description, currency, prices, trialDays?, features, limits }] },
  entitlements: { features: [{ id, name, description? }], plans: Record<planId, featureId[]> },
  auth: { signupFields, providers, mfa },
  shell: { multiWorkspace, workspaceSwitcher, darkMode, onboarding }
}
```

Provider identifiers and secrets are not modeled. Prices are catalog intent in major currency units;
E27 converts them for Stripe/provider consumers. IDs use lowercase kebab-case. Arrays preserve
author intent but are checked for uniqueness.

## Alternatives rejected

- **Put everything in `app.config.ts`:** client-visible, Nuxt-specific and unavailable cleanly to
  backend scripts; it also conflates product facts with presentation arrays.
- **One schema per existing layer in E26:** creates circular ownership before a stable public contract
  exists. E27 may add adapter-owned slices without changing the package API.
- **JSON/YAML:** loses executable typing and ergonomic composition; secrets are not made safer merely
  by changing syntax.
- **Environment-driven product identity:** makes local, CI and deploy output silently inconsistent.

## Compatibility

E26 is additive. Existing `app.config.ts`, Stripe fixture, feature catalog and i18n config remain the
runtime sources until E27. This makes the first implementation independently reversible.
