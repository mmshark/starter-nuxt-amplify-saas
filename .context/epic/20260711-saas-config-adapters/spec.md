# E27 — SaaS configuration adapters

> **Status**: Specified · **Created**: 2026-07-11 · **Depends on**: E26

## Hypothesis and outcome

We believe that projecting one validated manifest into each framework/provider boundary will remove
configuration drift without weakening secret or presentation boundaries.

**Outcome:** SaaS, landing, i18n, entitlements and backend seed/auth inputs consume typed projections
from `saas.config.ts`; legacy duplicated product catalogs are removed.

## Acceptance criteria

1. Adapter functions are pure, typed and unit-tested; consumers do not reach into manifest internals.
2. `apps/saas/app/app.config.ts` remains the owner of navigation and UI-only layout composition but
   derives brand/colors/shell facts from the adapter.
3. Landing derives public product/brand/legal facts and locales from the manifest.
4. Entitlements and billing seed inputs derive plan/feature facts from one projection; Stripe IDs and
   secrets remain provider/environment-owned.
5. Backend/auth projection supports declared signup/provider policy only where Amplify can express it;
   unsupported combinations fail during synthesis rather than being ignored.
6. Old duplicated facts and dead `saas.theme`/shell keys are removed or mapped to real consumers.
7. A drift test snapshots or compares every projection against the canonical manifest.
8. `task ci:all` and Amplify backend synthesis pass.

## Non-goals

- Repository initialization UX (E28).
- Runtime feature flags or remotely mutable configuration.
- Moving secrets into the manifest.

## Risk controls

Adapters are the trust boundary: public projections may include only publishable values; backend
projections may not manufacture Stripe resource identifiers; app config arrays stay explicit to
avoid Nuxt/defu concatenation surprises.
