# Pattern: Navigation Configuration

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/patterns/navigation-config.pattern.md

Mandatory pattern for all navigation menus (sidebar, header, user menu, footer). Navigation is composed at **build time** across three layers; runtime components read from a **single source of truth**.

## The rule

```
layers/saas/config/navigation.ts     ← layer exports static NavigationMenuItem defaults
        ↓ (explicit import + spread)
apps/saas/app/app.config.ts          ← app composes layer defaults + app items under saas.navigation
        ↓ (deep-merged by Nuxt app.config)
Runtime components                   ← read ONLY useAppConfig().saas.navigation
```

| # | Rule |
|---|------|
| 1 | Layer navigation defaults live in `layers/saas/config/navigation.ts` as typed static exports (`NavigationMenuItem` from `@nuxt/ui`). |
| 2 | Apps compose them in `app.config.ts` under `saas.navigation` via import + spread. Composition is **explicit opt-in** — the layer's own `layers/saas/app.config.ts` sets `navigation: {}`, so nothing is injected automatically. |
| 3 | Runtime components MUST read navigation from `useAppConfig().saas.navigation` (or the `useSaasConfig()` wrapper, `layers/saas/composables/useSaasConfig.ts`) — never import navigation config directly. |
| 4 | Dynamic entries (theme selector, user label, logout) are added by the component at render time, not by mutating config. |

The config shape is typed in `layers/saas/types/saas-config.ts` (`sidebar.main` / `sidebar.footer` / `header` / `userMenu`, all `NavigationMenuItem[][]`). The import path `@mmshark/saas-layer/config/navigation` resolves via the `"./config/*"` export in `layers/saas/package.json`.

## Layer exports

`layers/saas/config/navigation.ts` exports four constants:

| Export | Type | Content |
|--------|------|---------|
| `settingsSidebar` | `NavigationMenuItem` | `/settings` trigger item with children General, Members, Billing, Workspaces |
| `profileSidebar` | `NavigationMenuItem` | `/profile` item with children Profile, Account, Security, Notifications |
| `userMenuItems` | `NavigationMenuItem[][]` | `[profileSidebar.children]` — reuses the profile children for the user dropdown |
| `footerNavigation` | `NavigationMenuItem[]` | Feedback, Help & Support (placeholder external links — see Current status) |

## App composition

`apps/saas/app/app.config.ts` (condensed; verified against source):

```ts
import { settingsSidebar, footerNavigation, userMenuItems } from '@mmshark/saas-layer/config/navigation'

export default defineAppConfig({
  saas: {
    navigation: {
      sidebar: {
        main: [[
          { label: 'Home', icon: 'i-lucide-house', to: '/' },
          { label: 'Inbox', icon: 'i-lucide-inbox', to: '/inbox', badge: '4' },
          { label: 'Customers', icon: 'i-lucide-users', to: '/customers' },
          settingsSidebar            // layer default composed in
        ]],
        footer: [footerNavigation]   // layer default
      },
      header: [],
      userMenu: [
        ...userMenuItems,            // layer defaults (profile group)
        [{ label: 'Theme', icon: 'i-lucide-palette', type: 'theme-selector' },
         { label: 'Appearance', icon: 'i-lucide-sun-moon', type: 'appearance-selector' }],
        // ...further app-specific groups (Templates, Documentation, ...)
      ]
    }
  }
})
```

`type: 'theme-selector'` / `type: 'appearance-selector'` are sentinel values the consuming component swaps for dynamically-built submenus.

## Component consumption

`apps/saas/app/components/UserMenu.vue` (script excerpt; verified against source):

```ts
const appConfig = useAppConfig()
const menuConfig = appConfig.saas?.navigation?.userMenu || []

const items = computed<DropdownMenuItem[][]>(() => {
  const result: DropdownMenuItem[][] = [[{ type: 'label', label: user.value.name, avatar: user.value.avatar }]]
  menuConfig.forEach((group: any[]) => {
    result.push(group.map((item: any) => {
      if (item.type === 'theme-selector') return themeSelector           // built at runtime
      if (item.type === 'appearance-selector') return appearanceSelector // built at runtime
      return item
    }))
  })
  result.push([{ label: 'Log out', icon: 'i-lucide-log-out', onSelect: async () => { await signOut() } }])
  return result
})
```

**Allowed exception — layer-owned parent pages**: pages that ship inside `layers/saas` may import the config module directly, because they and the config are versioned together and the imported items feed a different surface (a panel toolbar, not the app sidebar), so no duplication can occur. Both do this:

```ts
// layers/saas/pages/settings.vue — same shape in layers/saas/pages/profile.vue with profileSidebar
import { settingsSidebar } from '@mmshark/saas-layer/config/navigation'
const title = computed(() => settingsSidebar.label || 'Settings')
const links = computed(() => [settingsSidebar.children || []] as NavigationMenuItem[][])
```

## Extending navigation

- **New default for all apps**: add the item to the relevant export in `layers/saas/config/navigation.ts`. Apps that compose that export pick it up on next build.
- **App-specific item**: append it in the app's `app.config.ts` after the spread layer defaults.
- **Full override**: omit the spread and define the array from scratch in `app.config.ts`.

## Anti-patterns

| Anti-pattern | Why it breaks | Fix |
|---|---|---|
| Runtime component imports from `@mmshark/saas-layer/config/navigation` | Duplicate menu items when `app.config.ts` also spreads the same export; bypasses app composition | Read `useAppConfig().saas.navigation` |
| Mutating layer exports (`settingsSidebar.children.push(...)`) | Mutates shared module state for every consumer of the layer | Compose additions in `app.config.ts` |
| Mutating `appConfig.saas.navigation` at runtime | `useAppConfig()` is reactive so it appears to work, but changes are in-memory only (lost on reload) and defeat the single source of truth | Keep navigation build-time; put dynamic behavior in component `computed`s (as with the selector sentinels) |

## Current status

- The pattern is implemented and followed in `apps/saas`; enforcement is by convention only (no lint rule).
- **Duplicate-shell caveat — two `UserMenu.vue` files exist** (see [tech debt](../architecture/tech-debt.md)):
  - `apps/saas/app/components/UserMenu.vue` — the one that actually renders (Nuxt component precedence: app shadows layer). Handles selector sentinels, "Log out".
  - `layers/saas/components/UserMenu.vue` — shipped in the published layer but eclipsed in this app. Diverges: reads config via `useSaasConfig()`, strips items to `{ label, icon, to }` (drops selector sentinels), labels the action "Sign Out", and reads a `picture` attribute nothing sets. Navigation/menu changes must be applied and checked in **both** files until the shells are unified.
- Placeholder content inherited from the Nuxt UI Pro dashboard template remains in the defaults: `footerNavigation` links point to Nuxt UI GitHub repos, and the app `userMenu` includes Templates / Documentation / GitHub repository / Upgrade to Pro groups. Replace these per product.
- All navigation labels are hardcoded English; the navigation config is not wired to the i18n layer.

## Related

- [App config composition](app-config-composition.md) — the general layer/app `app.config.ts` merge pattern this builds on
- [Tech debt](../architecture/tech-debt.md) — duplicate shell / dual UserMenu entry
