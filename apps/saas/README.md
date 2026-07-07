# @starter-nuxt-amplify-saas/saas

The main SaaS dashboard application: a Nuxt 4 SSR app that composes the
`@mmshark/saas-layer` meta-layer (which in turn bundles the `amplify`,
`auth`, `billing`, `workspaces`, `entitlements`, `uix`, and `i18n` layers)
plus the optional `@mmshark/debug-layer` for local development tooling.

See `nuxt.config.ts` in this directory for the exact `extends` array:

```ts
extends: [
  '@mmshark/saas-layer',   // complete dashboard shell (auth, billing, workspaces, entitlements, uix, i18n, amplify)
  '@mmshark/debug-layer'   // optional development/debug tools
]
```

This app owns only the instance-specific pieces: `app/app.config.ts`
(branding, navigation, sidebar/user-menu configuration), a handful of pages
(`app/pages/index.vue`, `inbox.vue`, `customers.vue`), the default layout,
and a few app-level components/composables/utils. Everything else
(authentication flows, billing pages, workspace management, entitlements,
design system) is provided by the layers it extends.

For the full architecture, layer catalog, and repository-wide conventions,
see the root [`README.md`](../../README.md) and [`AGENTS.md`](../../AGENTS.md).

## Prerequisites

This app cannot run standalone — it needs a deployed Amplify backend. Before
starting it:

1. From the repo root: `corepack enable && pnpm install`
2. Deploy an Amplify sandbox: `pnpm backend:sandbox:init`
3. Generate the frontend config: `pnpm amplify:sandbox:generate-outputs`
   (this produces `apps/backend/amplify_outputs.json`, which this app reads
   at build/runtime via the `amplify` layer)
4. Generate GraphQL types/operations: `pnpm amplify:sandbox:generate-graphql-client-code`

See the root `README.md`/`AGENTS.md` for the full sandbox bootstrap flow,
Stripe secrets setup, and seeding steps — this file only covers running
this specific app once the backend exists.

## Running

From the repo root:

```bash
pnpm saas:dev      # -> pnpm --filter @starter-nuxt-amplify-saas/saas run dev
pnpm saas:build    # -> pnpm --filter @starter-nuxt-amplify-saas/saas run build
```

Or from within `apps/saas/`:

```bash
pnpm dev
pnpm build
pnpm preview       # serve the production build locally
pnpm typecheck     # nuxt typecheck
```

Dev server defaults to `http://localhost:3000` (Nuxt falls back to `3001` if
`3000` is taken).

## Scripts

All scripts are defined in `apps/saas/package.json`:

| Script | What it does |
| --- | --- |
| `dev` | `nuxt dev` — start the dev server |
| `build` | `nuxt build` — production SSR build |
| `generate` | `nuxt generate` |
| `preview` | `nuxt preview` — serve a production build locally |
| `typecheck` | `nuxt typecheck` |
| `postinstall` | `nuxt prepare` (runs automatically after install) |
| `test:e2e` | Run the full Playwright suite (`tests/e2e/specs/`) |
| `test:e2e:auth` | Run only auth-layer e2e specs (`tests/e2e/specs/layers/auth/`) |
| `test:e2e:auth:signup` | Run only the signup spec |
| `test:e2e:auth:signin` | Run only the signin spec |
| `test:e2e:billing` | Run only billing-layer e2e specs (`tests/e2e/specs/layers/billing/`) |
| `test:e2e:billing:plans` | Run only the plans spec |
| `test:e2e:flows` | Run cross-layer flow specs (`tests/e2e/specs/flows/`) |
| `test:e2e:flow:new-user-journey` | Run the new-user-journey flow spec |
| `test:e2e:individual` | Run the Playwright `individual` project |
| `test:e2e:headed` | Full suite in headed (visible browser) mode |
| `test:e2e:debug` | Full suite with Playwright's `--debug` |
| `test:e2e:ui` | Full suite with Playwright's UI runner |
| `test:e2e:setup` | `playwright install chromium` |
| `test:e2e:clean` | Remove the local test cache (`tests/e2e/.cache/`) |

Equivalent root-level shortcuts also exist: `pnpm saas:test:e2e`,
`saas:test:e2e:auth`, `saas:test:e2e:billing`, `saas:test:e2e:headed`,
`saas:test:e2e:ui`, `saas:test:e2e:clean`, `saas:test:e2e:setup`.

## End-to-end tests

The Playwright suite lives in `tests/e2e/` (see `tests/e2e/README.md` for
the full architecture) and is organized into:

- `specs/layers/<layer>/` — atomic tests scoped to a single layer (auth,
  billing)
- `specs/flows/` — cross-layer integration tests (e.g. signup → subscribe)

These tests exercise real authentication and billing flows against a **live
Amplify sandbox** (real Cognito, real Stripe test-mode data seeded via the
backend's seed scripts) — they are not mocked and are **not** run as part of
default CI. To run them locally you need a deployed sandbox, generated
outputs/GraphQL client code, and seeded users/plans (see
`pnpm backend:sandbox:seed`, `seed:plans`, `seed:users` in the root
`README.md`/`AGENTS.md`), then:

```bash
pnpm test:e2e:setup   # once, installs the Chromium browser
pnpm test:e2e
```

## App structure

```
app/
├── app.vue
├── app.config.ts      # instance-specific branding/navigation (edit freely)
├── components/        # app-specific components (customers/, home/, inbox/, UserMenu.vue, ...)
├── composables/
├── layouts/            # default.vue
├── pages/              # index.vue, inbox.vue, customers.vue
├── types/
└── utils/
```
