# SaaS Meta-Layer

Complete SaaS application shell with layouts, pages, and navigation.

## Features

- Complete application shell (AppHeader, AppSidebar, layouts)
- Authentication pages (login, register, password reset)
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

### Configure

```typescript
// apps/saas/app.config.ts
export default defineAppConfig({
  saas: {
    brand: {
      name: 'Your App Name',
      logo: '/your-logo.svg'
    }
  }
})
```

## Components

- `AppHeader` - Top navigation bar with workspace switcher and user menu
- `AppSidebar` - Side navigation with configurable menu items
- `UserMenu` - User dropdown menu
- `WorkspaceSwitcherDropdown` - Workspace selection dropdown

## Layouts

- `dashboard` - Authenticated dashboard layout
- `auth` - Public authentication layout
- `onboarding` - First-time user setup layout

## Configuration

See [PRD](../../doc/prd/saas-layer.md) for full configuration documentation.
