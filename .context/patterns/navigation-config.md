# Pattern: Navigation Configuration

> **Status**: Active · **Reconciled**: 2026-07-11 · **Source**: code after E03

Navigation is composed at build time and read from one runtime source:

```text
layers/saas/config/navigation.ts
        ↓ explicit import + spread
apps/saas/app/app.config.ts
        ↓ useAppConfig / useSaasConfig
layers/saas layout and UserMenu
```

## Rules

1. Reusable static menu trees live in `layers/saas/config/navigation.ts` and use Nuxt UI's
   `NavigationMenuItem` type.
2. The app explicitly opts into and composes arrays in `apps/saas/app/app.config.ts`. Layer
   `app.config.ts` defaults contain no non-empty arrays because Nuxt/defu concatenates them.
3. Runtime shell components read only the composed `saas.navigation` app-config namespace; they do
   not import layer defaults.
4. Layer-owned parent pages may import their own settings/profile tree for their local toolbar.
5. Dynamic entries such as theme/appearance selectors are sentinel items resolved by `UserMenu` at
   render time. Authentication actions are component behavior, not static config mutation.
6. Product-specific navigation remains application presentation and therefore does **not** move into
   root `saas.config.ts` (E26).

## Current exports and consumers

| Export | Purpose |
|---|---|
| `settingsSidebar` | General, Members, Billing and Workspaces settings tree |
| `profileSidebar` | Profile, Account, Security and Notifications tree |
| `userMenuItems` | Profile children reused by the user dropdown |

`apps/saas/app/app.config.ts` composes Home + `settingsSidebar` for the sidebar and
`userMenuItems` + theme/appearance sentinels for the user menu. `layers/saas/layouts/default.vue`
and `layers/saas/components/UserMenu.vue` consume the result. E03 removed the former duplicate
app-local layout/UserMenu and placeholder footer/template links.

## Extension

- Add a default for every consumer to the layer export, then let apps opt in.
- Add an app-only item in the app config after/before the spread as appropriate.
- For a full override, omit the layer export and define a new array.
- Never mutate imported arrays or app config at runtime to persist navigation.

## Related

- [App config composition](app-config-composition.md)
- [SaaS configuration contract](../epics/20260711-saas-config-contract/spec.md)
