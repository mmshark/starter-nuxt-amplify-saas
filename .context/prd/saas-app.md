# PRD — SaaS Application

> **Status**: Active · **Reconciled**: 2026-07-11 · **Source**: code and current roadmap

## Purpose

The deployable SaaS dashboard combines Cognito authentication, group-isolated workspaces, Stripe
billing, entitlements and a professional Nuxt UI shell. It is a product foundation, not a
business-domain application.

## Architecture contract

- `apps/backend` owns Amplify Gen2 auth/data/functions/seeding.
- `apps/saas` is the Nuxt SSR deployment and extends `@mmshark/saas-layer`.
- `apps/landing` is the SSG marketing deployment and currently remains a skeleton.
- `layers/saas` owns the single application shell and base routes; feature layers own domain logic.
- Nitro REST routes use the mandatory auth/error patterns; Stripe webhooks terminate at the backend
  Lambda Function URL, never a Nitro route.
- Tenant tables are client-read-only and all writes cross privileged Lambda boundaries described in
  AGENTS.md.

## Functional state

| Area | Current state | Next owner |
|---|---|---|
| Authentication | Signup, verification, sign-in/out and reset work; authenticated password/email/delete and social/MFA remain | E07, E24 |
| Workspaces | Secure CRUD/membership backend and shell integration; invitations lack delivery/acceptance UX and lifecycle polish | E04, E08 |
| Billing | Free→paid Checkout, trials, plans, webhook sync, invoices and Portal verified end-to-end | completed E05 |
| Entitlements | Server enforcement and subscription hydration work; reusable UI gates are not adopted in product surfaces | E06, after E27 |
| Shell/UI | One layer-owned Nuxt UI v4 dashboard; template mocks and parallel shell removed | E11 for test depth |
| i18n | en/es infrastructure exists but UI adoption is absent | E13 |
| Onboarding | Not implemented; orphan layout/flag are not a product flow | E15 |
| Notifications | Not implemented; preferences page does not persist | E14 |
| Landing | Static skeleton without marketing/legal/SEO | E09 |

## Instance configuration boundary

The target configuration model is deliberately three-tiered:

1. **Product facts** — root `saas.config.ts`, validated and usable by frontend/backend (E26).
2. **Application presentation** — each app's `app.config.ts`, including navigation arrays and
   layout-specific choices; relevant product facts arrive through adapters (E27).
3. **Environment and secrets** — `.env`, Nuxt runtime config, Amplify outputs/secrets and Stripe/AWS
   resources; never client-bundled product config.

Today only tier 2/3 exist and product facts are duplicated across app config, Stripe fixtures,
entitlements and i18n. E26 defines the contract, E27 migrates consumers, and E28 provides `task init`.

## Quality requirements

- `task ci:all` is the offline quality contract.
- Live E2E uses a real Amplify sandbox and Stripe test mode; tests must state external prerequisites.
- Visible UI must not pretend to persist or perform an action that has no implementation.
- All configuration keys and documented APIs must have verified consumers.
- Security enforcement remains server-side even when UI gating improves usability.

## Open risks

- Post-confirmation swallows provisioning failures without compensation (E10/E17).
- Debug layer is composed in production builds and relies on per-page dev guards (E12 candidate).
- Notification preferences silently discard changes (E14).
- Test coverage is thin and E2E depends on external services (E11).
- Product facts remain duplicated until E26/E27.

## Related

- [Roadmap](roadmap.md)
- [Product definition](current.md)
- [SaaS layer](saas-layer.md)
- [Architecture overview](../architecture/overview.md)
- [App config composition](../patterns/app-config-composition.md)
