# Pattern: Nuxt Layers Architecture

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/patterns/layers.pattern.md

**Normative.** Every reusable feature in this monorepo MUST be built as a Nuxt Layer under `layers/`. Apps (`apps/saas`, `apps/landing`) stay thin and compose layers via `extends`.

## Why

In a pnpm monorepo with multiple Nuxt apps, ad-hoc sharing leads to copy-pasted utilities, inconsistent structure, and circular dependencies. Nuxt Layers are the unit of reuse: each layer owns one domain (auth, billing, workspaces, …) and exposes a public API via composables, components, and namespaced server routes.

## Layer inventory (verified against `layers/*/nuxt.config.ts` and `package.json`)

Package names follow `@mmshark/<layer>-layer`. Apps are `@starter-nuxt-amplify-saas/{backend,saas,landing}`.

| Layer | Package | Extends |
|---|---|---|
| `layers/amplify` | `@mmshark/amplify-layer` | — (foundation) |
| `layers/uix` | `@mmshark/uix-layer` | — (foundation) |
| `layers/i18n` | `@mmshark/i18n-layer` | — (foundation) |
| `layers/entitlements` | `@mmshark/entitlements-layer` | — (no `extends`; peer-depends on amplify/auth/workspaces to avoid a circular `extends` with workspaces) |
| `layers/auth` | `@mmshark/auth-layer` | `uix` |
| `layers/billing` | `@mmshark/billing-layer` | `uix`, `i18n` |
| `layers/workspaces` | `@mmshark/workspaces-layer` | `auth`, `entitlements`, `uix` |
| `layers/saas` | `@mmshark/saas-layer` | meta-layer: `amplify`, `uix`, `i18n`, `auth`, `billing`, `workspaces`, `entitlements` |
| `layers/debug` | `@mmshark/debug-layer` | `auth`, `billing` |

App composition (verified):

```ts
// apps/saas/nuxt.config.ts
extends: ['@mmshark/saas-layer', '@mmshark/debug-layer']

// apps/landing/nuxt.config.ts
extends: ['@mmshark/uix-layer', '@mmshark/amplify-layer']
```

Always extend by **package name** (`workspace:*` dependency), never by relative path.

## Standard structure

Required in every layer: `nuxt.config.ts`, `package.json`, `README.md`. Everything else is added only when the domain needs it:

```text
layers/<layer>/
  nuxt.config.ts          # extends, runtimeConfig, module options, i18n merge
  package.json            # @mmshark/<layer>-layer, exports, peerDependencies
  README.md               # Public API, usage, caveats
  components/             # Auto-imported UI components
  composables/            # SSR-safe composables
  middleware/             # Route middleware (auth, entitlements)
  plugins/                # Number-prefix for order (e.g. 01.amplify.client.ts)
  server/
    api/<layer>/...       # Namespaced Nitro routes
    utils/                # Server-only helpers (auto-imported by Nitro)
    middleware/           # Server middleware
  utils/                  # Shared isomorphic helpers
  types/                  # Type declarations / module augmentation
  config/                 # Declarative catalogs (e.g. entitlements features)
  i18n/locales/{en,es}/   # Layer-local translations (only billing and i18n today)
```

## Rules

1. **Encapsulation** — a layer owns its domain and namespace; other layers consume its public API only.
2. **Composition** — declare cross-layer needs via `extends` in `nuxt.config.ts` plus a matching `peerDependencies` entry. The `saas` meta-layer is the only place that composes the full set.
3. **Server route namespacing** — Nitro routes MUST live in `server/api/<layer>/...` (e.g. `layers/billing/server/api/billing/checkout.post.ts`). Known deviation: `layers/auth/server/api/profile.get.ts` / `profile.put.ts` are not namespaced — fix on next touch, do not copy.
4. **Explicit exports** — `package.json` sets `"main": "./nuxt.config.ts"` and glob subpath exports:

   ```json
   {
     "name": "@mmshark/auth-layer",
     "main": "./nuxt.config.ts",
     "exports": {
       ".": "./nuxt.config.ts",
       "./composables/*": "./composables/*",
       "./components/*": "./components/*",
       "./utils/*": "./utils/*",
       "./server/*": "./server/*"
     }
   }
   ```

   (Verified: `layers/auth/package.json`.)
5. **Config merging over duplication** — layer `nuxt.config.ts` contributes `runtimeConfig` and module options that Nuxt deep-merges up the chain, e.g. `layers/billing/nuxt.config.ts` adds Stripe `runtimeConfig` and registers its `i18n.locales` files, which merge with `@mmshark/i18n-layer`'s base config.

## Dependency management

The convention actually used (verified across all `layers/*/package.json`) is **peer-first**, not the "runtime deps in `dependencies`" rule the old doc stated:

| Section | Use for | Real examples |
|---|---|---|
| `peerDependencies` | `nuxt`, other layers (`workspace:*`), and heavy SDKs the consuming app installs | `aws-amplify` (amplify), `stripe` (billing), `zod` (entitlements), `@nuxt/ui` + `tailwindcss` (uix), `@nuxtjs/i18n` (i18n) |
| `dependencies` | Only packages the layer itself must resolve at runtime | `@aws-sdk/client-lambda` (amplify, billing, workspaces), `stripe` (billing) |
| `devDependencies` | Layers/tools needed to develop the layer standalone | `@mmshark/uix-layer` in auth; test tooling |

Apps then install the layers they extend as regular `dependencies: { "@mmshark/saas-layer": "workspace:*" }` (verified: `apps/saas/package.json`, `apps/landing/package.json`).

Troubleshooting: "Cannot find module" or IDE resolution errors usually mean the package is missing from the consuming app's `dependencies`, or a layer imports something it only lists as a peer of a *different* layer.

## Tooling

- `scripts/verify-layers.sh` — checks all 9 layers for required publishing config.
- `scripts/publish-layer.sh` / `scripts/publish-all-layers.sh` — publish to GitHub Packages.
- `scripts/generate-layer-packages.js` — **do not run blindly**: it regenerates layer `package.json` files from a hardcoded map that is stale (still references `@nuxt/ui-pro`, `stripe ^14`, `@nuxtjs/i18n ^8`) and would clobber the current, correct manifests.

## Current status

Pattern is implemented and followed by all 9 layers, with these verified deviations:

- `layers/auth` server routes are un-namespaced (rule 3 above).
- `layers/entitlements` and `layers/workspaces` peer-depend on each other; the cycle is broken by entitlements having no `extends` — it relies on the final app's layer chain providing auth/workspaces.
- The old pattern doc mentioned an "Admin" app; no admin app exists in this repo (only `apps/saas`, `apps/landing`, `apps/backend`).
- `scripts/generate-layer-packages.js` has drifted from the real manifests (see Tooling).
