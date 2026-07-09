# SaaS Meta-Layer

Complete SaaS application shell — the single dashboard layout, the user menu,
auth/dashboard pages, and an extensible navigation system. This meta-layer
composes all the feature layers into a ready-to-extend product shell.

## Features

- Single dashboard shell (`layouts/default.vue`, built on `@nuxt/ui`'s `UDashboard*` primitives)
- **Extensible navigation system** — add custom menu items from your app at build time
- Authentication pages (login, signup) via the `auth` layout
- Dashboard home page (welcome + workspace/plan/member cards)
- Configuration via the app's app config (`saas` key), typed by `useSaasConfig()`
- Responsive design + dark mode support

## Usage

### Extend in App

```typescript
// apps/saas/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@mmshark/saas-layer'
  ]
})
```

## Navigation Composition System

The SaaS layer provides **pre-composed navigation items** that can be imported
and used at build time in the app's `app.config.ts`.

### Layer Provides

The layer exports navigation constants from `config/navigation.ts`:

**`settingsSidebar`** — Settings menu with subitems:
- General, Members, Billing, Workspaces

**`profileSidebar`** — Profile settings menu with subitems:
- Profile, Account, Security, Notifications

**`userMenuItems`** — User dropdown groups (derived from `profileSidebar`).

### App Composes the Menu

Import and compose navigation items in your `app.config.ts` under the `saas`
key. The dashboard layout reads `saas.navigation.sidebar.main` (grouped) and
`saas.navigation.userMenu`:

```typescript
// apps/saas/app/app.config.ts
import { settingsSidebar, userMenuItems } from '@mmshark/saas-layer/config/navigation'

export default defineAppConfig({
  saas: {
    navigation: {
      sidebar: {
        main: [[{
          label: 'Home',
          icon: 'i-lucide-house',
          to: '/'
        },
        settingsSidebar  // Imported from the layer
        ]]
      },
      userMenu: [
        ...userMenuItems,
        // App-specific dynamic groups (resolved in UserMenu.vue):
        [{ label: 'Theme', type: 'theme-selector' },
         { label: 'Appearance', type: 'appearance-selector' }]
      ]
    }
  }
})
```

### Benefits

- ✅ **Build-time composition** — no runtime overhead
- ✅ **Type safety** — full TypeScript support (see `types/saas-config.ts`)
- ✅ **Single source of truth** — the Settings menu is defined once in the layer
- ✅ **Easy to extend** — apps add their own items alongside layer items

### Navigation Item Structure

```typescript
{
  label: string           // Display text
  icon?: string          // Lucide icon (e.g., 'i-lucide-house')
  to?: string            // Route path
  badge?: string         // Optional badge
  children?: MenuItem[]  // Nested items
  type?: 'trigger'       // For expandable menus
  defaultOpen?: boolean  // Open by default
  exact?: boolean        // Exact route match
}
```

## Components

- `UserMenu` — user dropdown (avatar with local initials, config-driven groups,
  theme/appearance selectors, log out). Carries `data-testid="user-menu"`.

> The workspace switcher (`WorkspaceSwitcher`) rendered in the shell header
> comes from the `workspaces` layer, not this one; the dashboard search and
> sidebar primitives come from `@nuxt/ui` (via the `uix` layer).

## Layouts

- `default` — authenticated dashboard shell (`UDashboardGroup` + sidebar +
  search + user menu). The default layout for every page.
- `auth` — public authentication layout (login/signup).
- `onboarding` — **unused**; a placeholder for the future onboarding flow
  (owned by roadmap epic E15). Not wired to any page today.

## Other Configuration

### Brand

```typescript
saas: {
  brand: {
    name: 'My Company',
    logo: '/logo.svg',
    description: 'My SaaS Platform',
    favicon: '/favicon.ico'
  }
}
```

### Features

```typescript
saas: {
  features: {
    multiWorkspace: true,
    workspaceSwitcher: true,  // gates WorkspaceSwitcher in the shell header
    onboarding: true,         // reserved for E15; no runtime effect yet
    darkMode: true
  }
}
```

### Theme

```typescript
saas: {
  theme: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    }
  }
}
```

## Architecture

```
Layer: saas
├── Composables
│   └── useSaasConfig() - Typed configuration access (appConfig.saas)
├── Components
│   └── UserMenu
├── Config
│   └── navigation.ts - settingsSidebar / profileSidebar / userMenuItems
├── Pages
│   ├── index.vue - dashboard home (welcome)
│   ├── settings*, profile* - settings/profile pages (UDashboardPanel-based)
│   └── auth/* - login / signup
└── Layouts
    ├── default - dashboard shell
    ├── auth - authentication
    └── onboarding - unused (E15)
```

## Dependencies

Extends: amplify, auth, billing, workspaces, entitlements, uix, i18n
