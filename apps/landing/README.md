# @starter-nuxt-amplify-saas/landing

The public marketing/landing site: a Nuxt 4 app intended to be statically
generated (SSG) and deployed separately from the `saas` dashboard app.

See `nuxt.config.ts` in this directory for the exact `extends` array:

```ts
extends: [
  '@mmshark/uix-layer',
  '@mmshark/amplify-layer'
]
```

It extends `uix` for the shared design system/components and `amplify` for
Amplify client configuration and GraphQL access (e.g. to read public data
such as subscription plans for a pricing section) — it does **not** extend
`auth`, `billing`, `workspaces`, `entitlements`, or the `saas` meta-layer,
since this site has no authenticated area.

Note: at the time of writing this app is a minimal scaffold — `app/app.vue`
still renders the default `NuxtWelcome` component and no custom pages exist
yet under `app/`. The layers it extends (`uix`, `amplify`) are already wired
up, so building out real marketing pages here is a matter of adding
`app/pages/*.vue` and components, not changing the layer composition.

## Running

From the repo root:

```bash
pnpm landing:dev        # -> pnpm --filter @starter-nuxt-amplify-saas/landing run dev
pnpm landing:build      # -> pnpm --filter @starter-nuxt-amplify-saas/landing run build
pnpm landing:generate   # -> pnpm --filter @starter-nuxt-amplify-saas/landing run generate (SSG)
```

Or from within `apps/landing/`:

```bash
pnpm dev
pnpm build
pnpm generate
pnpm preview
```

Dev server defaults to `http://localhost:3000` (or the next free port —
`3001` if the `saas` app is already running on `3000`).

## Scripts

All scripts are defined in `apps/landing/package.json`:

| Script | What it does |
| --- | --- |
| `dev` | `nuxt dev` |
| `build` | `nuxt build` |
| `generate` | `nuxt generate` — static site generation |
| `preview` | `nuxt preview` |
| `postinstall` | `nuxt prepare` (runs automatically after install) |

Unlike `apps/saas`, this app has no test scripts.

## Env/config

This app reads Amplify configuration through the `amplify` layer, which
requires `apps/backend/amplify_outputs.json` to exist — generate it from the
repo root with `pnpm amplify:sandbox:generate-outputs` (or the production
equivalent `pnpm amplify:generate-outputs`) after the backend has been
deployed. It does not require Stripe secret keys directly; any pricing data
it displays would be read via public/read-only Amplify data access, not the
authenticated billing API used by the `saas` app.

Deployment build settings (Amplify Console / monorepo build) live in
`apps/landing/amplify.yml`.
