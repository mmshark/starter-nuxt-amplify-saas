# Make It Yours

A practical checklist for turning this starter kit into your own product:
rebranding the package scope, knowing which files are safe to edit freely
vs. which are layer-owned, and going from a fresh clone to a running
instance with your own AWS account, Stripe account, and domains.

This guide is intentionally focused on the *mechanics* of forking/rebranding.
For the full architecture and layer catalog, see the root
[`README.md`](../../README.md) and [`AGENTS.md`](../../AGENTS.md) — this
guide defers to whatever those files say about the sandbox/deploy flow; if
you spot a discrepancy between this guide and them, the actual scripts in
`package.json`/`apps/*/package.json` are the source of truth.

## 1. Rebranding the package scope

Every layer package is named `@mmshark/<layer>-layer` (9 layers: `amplify`,
`auth`, `billing`, `debug`, `entitlements`, `i18n`, `saas`, `uix`,
`workspaces`). The three apps are named `@starter-nuxt-amplify-saas/backend`,
`@starter-nuxt-amplify-saas/saas`, and `@starter-nuxt-amplify-saas/landing`.
If you're renaming the project, both scopes need to change consistently
across several kinds of references:

- **`package.json` `name` fields** — every `layers/*/package.json` and
  `apps/*/package.json`.
- **`workspace:*` cross-references** — e.g. `apps/saas/package.json`
  depends on `"@mmshark/saas-layer": "workspace:*"` and
  `"@mmshark/debug-layer": "workspace:*"`; `layers/saas/package.json` in
  turn depends on `@mmshark/amplify-layer`, `@mmshark/uix-layer`,
  `@mmshark/i18n-layer`, `@mmshark/auth-layer`, `@mmshark/billing-layer`,
  `@mmshark/workspaces-layer`, `@mmshark/entitlements-layer`.
- **`extends: [...]` arrays** in every `apps/*/nuxt.config.ts` (e.g.
  `apps/saas/nuxt.config.ts` extends `@mmshark/saas-layer` and
  `@mmshark/debug-layer`; `apps/landing/nuxt.config.ts` extends
  `@mmshark/uix-layer` and `@mmshark/amplify-layer`).
- **Deep imports** into a layer's internals, e.g.
  `@mmshark/amplify-layer/server/utils/amplify`,
  `@mmshark/workspaces-layer/types/workspaces`,
  `@mmshark/saas-layer/config/navigation`,
  `@mmshark/uix-layer/assets/css/main.css`.
- **Root `package.json` `--filter` scripts** — e.g.
  `pnpm --filter @starter-nuxt-amplify-saas/saas run dev`,
  `pnpm --filter @starter-nuxt-amplify-saas/backend run sandbox:init`. If you
  rename the app packages, every `--filter @starter-nuxt-amplify-saas/*`
  reference in the root `package.json` scripts block must be updated too.
- **Publish config** — every layer's `package.json` has
  `"publishConfig": { "registry": "https://npm.pkg.github.com", "access": "restricted" }`
  and a `"repository"` field pointing at
  `git+https://github.com/mmshark/starter-nuxt-amplify-saas.git`. Only
  relevant if you intend to publish your fork's layers to your own GitHub
  Packages registry (see `.github/workflows/publish-layers.yml` and
  `scripts/publish-layer.sh` / `scripts/publish-all-layers.sh` /
  `scripts/verify-layers.sh`, which drive that workflow).

Find every occurrence before renaming:

```bash
# Layer/app package references in TS/Vue source
grep -rln "@mmshark/" --include="*.ts" --include="*.vue" .

# App-scope references (also catches package.json/root scripts)
grep -rln "@starter-nuxt-amplify-saas/" --include="*.ts" --include="*.vue" --include="*.json" .

# Layer publish config specifically
grep -l publishConfig layers/*/package.json
```

Rename in `package.json` files and `nuxt.config.ts` `extends` arrays first,
then re-run `pnpm install` so the pnpm workspace symlinks resolve to the new
names, then fix remaining deep imports flagged by TypeScript/`nuxt
typecheck`.

## 2. What's safe to edit vs. layer-owned

- **Instance-specific (edit freely per project):**
  - `apps/saas/app/app.config.ts` — brand (name/logo/description/favicon),
    sidebar/header/footer navigation, and user-menu items for *this*
    deployment of the dashboard. It imports shared navigation building
    blocks (`settingsSidebar`, `footerNavigation`, `userMenuItems`) from
    `@mmshark/saas-layer/config/navigation` and composes them with
    app-specific items — this is the intended customization point, not
    something to fork.
  - `layers/saas/app.config.ts` — the meta-layer's *defaults* for brand,
    theme colors (`primary`/`neutral`), feature toggles
    (`multiWorkspace`, `workspaceSwitcher`, `onboarding`, `darkMode`), and
    layout options (sidebar collapsibility, auth-page branding/footer).
    Nuxt merges app-level `app.config.ts` over layer-level ones, so you
    normally override these in `apps/saas/app/app.config.ts` rather than
    editing the layer default directly — but if you're maintaining your own
    fork rather than composing published layers, changing the layer default
    here is also reasonable.
  - Theme *tokens* (fonts, color scale) live in
    `layers/uix/assets/css/main.css` (a Tailwind v4 `@theme` block, e.g.
    `--font-sans`, `--color-green-*`) — there is no `layers/uix/app.config.ts`;
    color/theme customization is split between this CSS file (raw tokens)
    and the `theme.colors` object in `layers/saas/app.config.ts` /
    `apps/saas/app/app.config.ts` (semantic `primary`/`neutral` mapping).
  - App-specific pages/components under `apps/saas/app/pages`,
    `apps/saas/app/components`, and anything under `apps/landing/app/`.

- **Layer-owned (reusable, meant to be consumed as-is or forked, not
  hand-edited per-instance):** composables, server routes
  (`server/api/<layer>/...`), and components inside `layers/*/` — this is
  the whole point of the layer architecture. If you need different
  behavior, either configure it through the app-level `app.config.ts`/
  `nuxt.config.ts` (preferred), or override a specific file by placing one
  at the same relative path in the app (standard Nuxt layer override
  semantics), rather than editing the layer's copy in place.

## 3. From "just cloned" to "running your own instance"

1. **Install tooling and dependencies**
   ```bash
   corepack enable && pnpm install
   ```
   Requires Node.js ≥20.19 and pnpm 10.13.1 (pinned via `packageManager` in
   the root `package.json`).

2. **Deploy a backend sandbox**
   ```bash
   pnpm backend:sandbox:init
   ```
   Deploys Cognito, DynamoDB, AppSync, and Lambda resources to your AWS
   account via `ampx sandbox` and produces the initial
   `apps/backend/amplify_outputs.json`.

3. **Set Stripe secrets on the sandbox**
   ```bash
   STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... pnpm backend:sandbox:secrets
   ```
   This runs `apps/backend`'s `sandbox:secrets` script, which pipes
   `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from your shell
   environment into `ampx sandbox secret set`. You can set a placeholder
   webhook secret now and correct it in step 5 once you have the real
   Function URL registered with Stripe.

4. **Generate frontend config and GraphQL client code**
   ```bash
   pnpm amplify:sandbox:generate-outputs
   pnpm amplify:sandbox:generate-graphql-client-code
   ```

5. **Register the Stripe webhook**
   The Stripe webhook is a direct AWS Lambda Function URL (not a Nuxt/Nitro
   route) — see `apps/backend/amplify/backend.ts` (`addFunctionUrl` with
   `FunctionUrlAuthType.NONE`) and
   `apps/backend/amplify/functions/stripe-webhook/handler.ts`. After
   deploying, read the generated URL from
   `apps/backend/amplify_outputs.json` → `custom.stripeWebhookUrl` and
   register it as a webhook endpoint in the Stripe dashboard, or forward to
   it locally for testing:
   ```bash
   STRIPE_WEBHOOK_URL=<custom.stripeWebhookUrl from amplify_outputs.json> pnpm billing:stripe:listen
   ```
   (`billing:stripe:listen` runs the backend's `stripe:listen` script, which
   wraps `stripe listen --forward-to "$STRIPE_WEBHOOK_URL"`.) Use
   `pnpm billing:stripe:login` first to authenticate the Stripe CLI.

6. **Seed plans and users**
   ```bash
   pnpm backend:sandbox:seed:plans
   pnpm backend:sandbox:seed:users
   # or both: pnpm backend:sandbox:seed
   ```

7. **Run the apps**
   ```bash
   pnpm saas:dev       # dashboard, http://localhost:3000
   pnpm landing:dev    # marketing site, http://localhost:3001 if 3000 is taken
   ```

8. **Rebrand instance config** — update `apps/saas/app/app.config.ts`
   (brand name/logo/description/favicon, navigation) and, if you're
   maintaining a fork, `layers/saas/app.config.ts` defaults and
   `layers/uix/assets/css/main.css` theme tokens. See section 2 above.

9. **Go to production** — create separate Amplify Console apps for the
   backend, `saas`, and `landing` (each with `appRoot`/`buildPath` pointing
   at its subfolder, per the existing `apps/*/amplify.yml` files), point
   your own domain names at the `saas` and `landing` apps, set production
   Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) as Amplify
   Console secrets rather than local sandbox secrets, and register the
   deployed `custom.stripeWebhookUrl` as your production webhook endpoint in
   the Stripe dashboard.

**Verified facts this guide relies on:** Node ≥20.19 (root `AGENTS.md`
Tech Stack and `README.md` Prerequisites), pnpm 10.13.1 via `corepack`, and
`@nuxt/ui` v4 — a free/MIT package (see `peerDependencies` in
`layers/uix/package.json`); there is no paid Nuxt UI Pro dependency anywhere
in this repo. If a future edit to this guide, `README.md`, or `AGENTS.md`
drifts from the actual scripts in `package.json`/`apps/*/package.json`,
trust the code.
