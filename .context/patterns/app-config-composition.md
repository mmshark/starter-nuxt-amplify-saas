# Pattern: app.config.ts Composition

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/patterns/app-config-composition.pattern.md

Mandatory pattern for how layers ship default configuration and how apps customize it. Contributors MUST follow the rules below when adding configuration to any layer or app.

## Rules (normative)

1. **Layers export reusable config as TypeScript modules** under `<layer>/config/` (e.g. `layers/saas/config/navigation.ts`), typed with `@nuxt/ui` types and exposed via a `"./config/*"` subpath export in the layer's `package.json` (see `layers/saas/package.json`).
2. **Layer `app.config.ts` defaults contain objects and primitives only — never non-empty arrays.** Nuxt merges app configs with defu, which *concatenates* arrays, so an app could never remove a layer-supplied array item. Arrays (navigation menus, item groups) live in config modules that apps opt into explicitly.
3. **Apps compose in their own `app/app.config.ts`**: import the layer's config modules via the workspace package name (`@mmshark/saas-layer/config/navigation`) and combine them with spread / literal placement.
4. **Components and layouts read configuration only from `useAppConfig()`** (or a typed wrapper like `useSaasConfig()`). Never import a layer's config module from app components — that bypasses the composed single source of truth. Importing a config module *inside its owning layer* is acceptable.
5. **Type the config namespace by augmenting `AppConfigInput`** in `nuxt/schema` from the layer's `types/` directory (see `layers/saas/types/saas-config.ts`), so app authors get autocomplete and compile-time checks.

## Merge behavior (verified)

Nuxt generates `.nuxt/app.config.mjs` that merges all `app.config.ts` files with `defuFn` from [defu](https://github.com/unjs/defu), app first (highest priority):

```js
// apps/saas/.nuxt/app.config.mjs (generated)
import { defuFn } from 'defu'
import cfg0 from '<repo>/apps/saas/app/app.config.ts'   // highest priority
import cfg1 from '<repo>/layers/saas/app.config.ts'
export default defuFn(cfg0, cfg1, inlineConfig)          // inlineConfig = Nuxt UI defaults
```

| Value type | Merge behavior |
|---|---|
| Objects | Deep merge; app key wins, other layer keys are inherited |
| Primitives | App value wins |
| Arrays | **Concatenated** (app entries first, layer entries appended) — *not* replaced |
| Functions | `defuFn`: a function in higher-priority config receives the lower-priority value and returns the result |

> **Correction vs. the pre-migration doc**: the old doc claimed arrays "replace entirely". That is wrong — defu concatenates them. This is exactly why rule 2 exists and why `layers/saas/app.config.ts` sets `navigation: {}` instead of default menu arrays.

## Reference implementation

| Role | File |
|---|---|
| Layer config module | `layers/saas/config/navigation.ts` — exports `settingsSidebar`, `profileSidebar`, `userMenuItems` |
| Layer defaults | `layers/saas/app.config.ts` — `brand`, `features`, `layouts`, `theme`; `navigation: {}` on purpose |
| App composition | `apps/saas/app/app.config.ts` |
| Type augmentation | `layers/saas/types/saas-config.ts` |
| Typed accessor | `layers/saas/composables/useSaasConfig.ts` |
| Consumers | `layers/saas/layouts/default.vue`, `layers/saas/components/UserMenu.vue`, auth/layout components |

### Layer config module

```typescript
// layers/saas/config/navigation.ts (excerpt)
import type { NavigationMenuItem } from '@nuxt/ui'

export const settingsSidebar: NavigationMenuItem = {
  label: 'Settings',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [
    { label: 'General', to: '/settings', exact: true },
    { label: 'Members', to: '/settings/members' },
    { label: 'Billing', to: '/settings/billing' },
    { label: 'Workspaces', to: '/settings/workspaces' }
  ]
}

// Derived from profileSidebar (DRY — one definition feeds two menus)
export const userMenuItems: NavigationMenuItem[][] = [
  profileSidebar.children || []
]
```

### Layer defaults

```typescript
// layers/saas/app.config.ts (excerpt)
export default defineAppConfig({
  saas: {
    brand: { name: 'SaaS App', logo: '/logo.svg', description: 'Professional SaaS Application', favicon: '/favicon.ico' },
    navigation: {},   // intentionally empty — menu arrays live in config/navigation.ts (see rule 2)
    features: { multiWorkspace: true, workspaceSwitcher: true, onboarding: true, darkMode: true },
    layouts: {
      dashboard: { sidebarCollapsible: true, sidebarDefaultCollapsed: false },
      auth: { showBranding: true, showFooter: true }
    },
    theme: { colors: { primary: 'blue', neutral: 'slate' } }
  }
})
```

### App composition

```typescript
// apps/saas/app/app.config.ts (condensed)
import { settingsSidebar, userMenuItems } from '@mmshark/saas-layer/config/navigation'

export default defineAppConfig({
  saas: {
    brand: { name: 'Starter SaaS', logo: '/logo.svg', description: 'Nuxt Amplify SaaS Starter', favicon: '/favicon.ico' },
    navigation: {
      sidebar: {
        main: [[
          { label: 'Home', icon: 'i-lucide-house', to: '/' },
          { label: 'Inbox', icon: 'i-lucide-inbox', to: '/inbox', badge: '4' },
          { label: 'Customers', icon: 'i-lucide-users', to: '/customers' },
          settingsSidebar            // imported from the layer
        ]],
        footer: []
      },
      header: [],
      userMenu: [
        ...userMenuItems,            // layer defaults, composed with spread
        [
          { label: 'Theme', icon: 'i-lucide-palette', type: 'theme-selector' },
          { label: 'Appearance', icon: 'i-lucide-sun-moon', type: 'appearance-selector' }
        ]
        // ...further app-specific groups (Templates, Documentation, GitHub, ...)
      ]
    },
    theme: { colors: { primary: 'blue', neutral: 'slate' } }
  }
})
```

### Type augmentation

```typescript
// layers/saas/types/saas-config.ts (excerpt)
declare module 'nuxt/schema' {
  interface AppConfigInput {
    saas?: {
      brand?: { name?: string, logo?: string, description?: string, favicon?: string }
      navigation?: {
        sidebar?: { main?: NavigationMenuItem[][], footer?: NavigationMenuItem[][] }
        header?: NavigationMenuItem[]
        userMenu?: NavigationMenuItem[][]
      }
      // features?, layouts?, theme? — see file for the full shape
    }
  }
}

export type SaasConfig = NonNullable<AppConfigInput['saas']>
```

Only `AppConfigInput` is augmented (not the merged `AppConfig`), so `useAppConfig().saas` is untyped at the read site. The layer ships a typed accessor:

```typescript
// layers/saas/composables/useSaasConfig.ts (complete)
export function useSaasConfig(): SaasConfig {
  const appConfig = useAppConfig()
  return appConfig.saas as SaasConfig
}
```

### Component consumption

```typescript
// layers/saas/layouts/default.vue (excerpt) — sidebar from composed config
const mainLinks = computed(() =>
  appConfig.saas?.navigation?.sidebar?.main?.map(group =>
    group.map(addOnSelectToMenuItem)
  ) as NavigationMenuItem[][] ?? [[]]
)
```

```typescript
// layers/saas/components/UserMenu.vue (excerpt) — marker types swapped at runtime
const menuConfig = appConfig.saas?.navigation?.userMenu || []
// per item:
if (item.type === 'theme-selector') return themeSelector           // live color picker
if (item.type === 'appearance-selector') return appearanceSelector // light/dark toggle
```

The app-level `UserMenu.vue` overrides the layer's `layers/saas/components/UserMenu.vue` (standard Nuxt layer component precedence). Marker items (`type: 'theme-selector'` etc.) keep `app.config.ts` static while letting components inject dynamic behavior.

## Anti-patterns

| Anti-pattern | Why it's wrong | Instead |
|---|---|---|
| Importing `@mmshark/saas-layer/config/navigation` from an app component | Bypasses the composed config; two sources of truth | Read `useAppConfig()` / `useSaasConfig()` |
| Mutating an imported config module object (`settingsSidebar.children.push(...)`) | Mutates shared module state for every consumer | Compose a new array in `app.config.ts` |
| Non-empty array defaults in a layer `app.config.ts` | defu concatenation makes layer items unremovable by apps | Export arrays as config modules; apps opt in |
| Using app config as a runtime state store | `useAppConfig()` *is* reactive and client-mutable (the theme selector mutates `appConfig.ui.colors`), but changes are per-client, in-memory, and unpersisted | Use real state (composables/stores) for anything that must persist or sync |

> **Correction vs. the pre-migration doc**: the old doc claimed runtime writes to app config "won't work, config is read-only". In fact Nuxt app config is reactive and writable at runtime — the shipped theme selector relies on it — but it is not persistence, so the anti-pattern stands for state management.

## Current status / planned contract

- E03 consolidated the runtime shell into `layers/saas`; references to an app-local parallel shell are historical.
- `saas.theme.colors`, `saas.features.onboarding` and `saas.features.multiWorkspace` remain decorative
  keys. E27 will remove them or project real product facts to their actual consumers.
- E26 introduces a framework-neutral root `saas.config.ts` for stable product facts. This does not
  replace app config: presentation objects and all navigation arrays remain app-config concerns.
- `layers/debug/pages/debug/index.vue` must read billing plans from the public plans API, never an
  `appConfig.billing.plans` key; any remaining fallback is debug-only debt.

## References

- [Nuxt App Config](https://nuxt.com/docs/guide/directory-structure/app-config)
- [Nuxt Layers](https://nuxt.com/docs/guide/going-further/layers)
- [defu merge semantics](https://github.com/unjs/defu)
