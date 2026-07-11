# `@mmshark/saas-config`

Framework-neutral contract for stable SaaS product facts. The root [`saas.config.ts`](../saas.config.ts)
is the canonical manifest and is validated immediately by `defineSaasConfig()`.

```ts
import config from '../saas.config'
import { defineSaasConfig, type SaasConfig } from '@mmshark/saas-config'
```

## Configuration boundary

| Tier | Owner | Examples |
|---|---|---|
| Product facts | `saas.config.ts` | identity, public URLs, brand colors/assets, locales, plans, entitlement catalog, auth policy, shell capabilities |
| App presentation | each app's `app.config.ts` | navigation arrays, layout composition, app-only UI choices |
| Environment/secrets | `.env`, Nuxt runtime config, Amplify outputs/secrets | AWS resource IDs, Stripe keys/price IDs, deploy-stage URLs and credentials |

Secrets and provider resource identifiers are deliberately absent from the schema. The manifest is
safe to import from frontend and backend build code, but E26 does not switch existing runtime
consumers. Projection/adoption belongs to E27.

Validation includes duplicate IDs, locale/default consistency, currency consistency, required plan
entitlement mappings and plan/feature cross-references. Zod errors include the failing property path.
