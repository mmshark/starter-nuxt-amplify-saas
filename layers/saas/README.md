# SaaS Meta-Layer

Complete SaaS application shell with layouts, pages, and extensible navigation system.

## Features

- Complete application shell (AppHeader, AppSidebar, layouts)
- **Extensible navigation system** - Add custom menu items from your app
- Authentication pages (login, signup)
- Dashboard home page
- Configuration via app.config.ts
- Responsive design
- Dark mode support

## Usage

### Extend in App

```typescript
// apps/saas/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@starter-nuxt-amplify-saas/saas'
  ]
})
```

## Navigation Composition System

The SaaS layer provides **pre-composed navigation items** that can be imported and used at build time in `app.config.ts`.

### Layer Provides

The layer exports navigation constants from `config/navigation.ts`:

**`settingsSidebar`** - Complete Settings menu with subitems:
- General, Workspaces, Members, Security, Billing, Test

**`userMenuItems`** - User dropdown menu items:
- Profile, Account, Billing

**`footerNavigation`** - Footer navigation items:
- Feedback, Help & Support

### App Composes the Menu

Import and compose navigation items in your `app.config.ts`:

```typescript
// apps/saas/app/app.config.ts
import { settingsSidebar, footerNavigation } from '@starter-nuxt-amplify-saas/saas/config/navigation'

export default defineAppConfig({
  dashboard: {
    navigation: {
      main: [[{
        label: 'Home',
        icon: 'i-lucide-house',
        to: '/'
      }, {
        label: 'Inbox',
        icon: 'i-lucide-inbox',
        to: '/inbox',
        badge: '4'
      },
      settingsSidebar  // Imported from layer
      ],
      footerNavigation  // Imported from layer
      ]
    }
  }
})
```

### Benefits

- ✅ **Build-time composition** - No runtime overhead
- ✅ **Type safety** - Full TypeScript support
- ✅ **Single source of truth** - Settings menu defined once in the layer
- ✅ **Easy to extend** - Apps can add their own items alongside layer items

### Navigation Item Structure

```typescript
{
  label: string           // Display text
  icon?: string          // Lucide icon (e.g., 'i-lucide-home')
  to?: string            // Route path
  badge?: string         // Optional badge
  children?: MenuItem[]  // Nested items
  click?: () => void     // Click handler
  type?: 'trigger'       // For expandable menus
  defaultOpen?: boolean  // Open by default
  exact?: boolean        // Exact route match
}
```

## Components

- `AppHeader` - Top navigation bar with workspace switcher and user menu
- `AppSidebar` - Side navigation (uses `useSaasNavigation()`)
- `UserMenu` - User dropdown menu
- `WorkspaceSwitcher` - Workspace selection dropdown

## Layouts

- `dashboard` - Authenticated dashboard layout
- `auth` - Public authentication layout
- `onboarding` - First-time user setup layout

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
    workspaceSwitcher: true,
    onboarding: false,
    darkMode: true
  }
}
```

### Theme

```typescript
saas: {
  theme: {
    colors: {
      primary: 'indigo',
      neutral: 'zinc'
    }
  }
}
```

## Architecture

```
Layer: saas
├── Composables
│   ├── useSaasNavigation() - Extensible navigation
│   └── useSaasConfig() - Configuration access
├── Components
│   ├── AppHeader, AppSidebar, UserMenu
│   └── WorkspaceSwitcher
└── Layouts
    ├── dashboard, auth, onboarding
```

## Dependencies

Extends: amplify, auth, billing, workspaces, entitlements, uix, i18n
