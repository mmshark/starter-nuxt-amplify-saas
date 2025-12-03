# Pattern: Navigation Configuration System

**Date**: 2025-12-03
**Status**: Documented
**Type**: Architecture Pattern

---

## Context and Problem Statement

SaaS applications require flexible navigation configuration that can:
- Provide sensible defaults from the framework layer
- Allow applications to customize navigation items
- Maintain a single source of truth for components
- Support type-safe configuration at build time
- Enable easy updates from the framework without breaking app customizations

**Problem**: How do we configure navigation in a way that separates framework defaults from app-specific customizations while maintaining type safety and avoiding duplicate menu items?

---

## Decision

Implement a **3-Layer Navigation Configuration Architecture**:

```
Layer Config (layers/saas/config/navigation.ts)
  → Exports navigation items as static configuration
    ↓
App Config (apps/saas/app/app.config.ts)
  → Imports layer config and composes using spread operator
  → Adds app-specific items
  → Deep merges with Nuxt's app.config system
    ↓
Component (UserMenu.vue, AppSidebar.vue, etc.)
  → Reads ONLY from useAppConfig().saas.navigation
  → Single source of truth
  → No direct layer imports
```

---

## Implementation

### Layer 1: Layer Configuration Module

**File**: `layers/saas/config/navigation.ts`

```typescript
import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * Settings sidebar menu with all workspace-related settings
 */
export const settingsSidebar: NavigationMenuItem = {
  label: 'Settings',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: 'General',
    to: '/settings',
    exact: true
  }, {
    label: 'Members',
    to: '/settings/members'
  }, {
    label: 'Billing',
    to: '/settings/billing'
  }, {
    label: 'Workspaces',
    to: '/settings/workspaces'
  }]
}

/**
 * Profile sidebar menu for user profile pages
 */
export const profileSidebar: NavigationMenuItem = {
  label: 'Profile',
  to: '/profile',
  icon: 'i-lucide-user',
  children: [{
    label: 'Profile',
    icon: 'i-lucide-user',
    to: '/profile',
    exact: true
  }, {
    label: 'Account',
    icon: 'i-lucide-settings',
    to: '/profile/account'
  }, {
    label: 'Security',
    icon: 'i-lucide-shield',
    to: '/profile/security'
  }, {
    label: 'Notifications',
    icon: 'i-lucide-bell',
    to: '/profile/notifications'
  }]
}

/**
 * User menu items (derived from profileSidebar for consistency)
 */
export const userMenuItems: NavigationMenuItem[][] = [
  profileSidebar.children || []
]

/**
 * Footer navigation items (Help & Support, etc.)
 */
export const footerNavigation: NavigationMenuItem[] = [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/nuxt-ui-pro/dashboard',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt/ui-pro',
  target: '_blank'
}]
```

**Key Characteristics**:
- Static exports (build-time configuration)
- Type-safe with `NavigationMenuItem` from @nuxt/ui
- Organized by navigation area (sidebar, user menu, footer)
- Reusable items (e.g., `profileSidebar.children` → `userMenuItems`)

### Layer 2: App Configuration Composition

**File**: `apps/saas/app/app.config.ts`

```typescript
import { settingsSidebar, footerNavigation, userMenuItems } from '@starter-nuxt-amplify-saas/saas/config/navigation'

export default defineAppConfig({
  saas: {
    brand: {
      name: 'Starter SaaS',
      logo: '/logo.svg',
      description: 'Nuxt Amplify SaaS Starter',
      favicon: '/favicon.ico'
    },
    navigation: {
      sidebar: {
        // Main sidebar navigation
        main: [[{
          label: 'Home',
          icon: 'i-lucide-house',
          to: '/'
        }, {
          label: 'Inbox',
          icon: 'i-lucide-inbox',
          to: '/inbox',
          badge: '4'
        }, {
          label: 'Customers',
          icon: 'i-lucide-users',
          to: '/customers'
        },
        settingsSidebar  // Layer configuration imported
        ]],
        // Footer sidebar navigation
        footer: [
          footerNavigation  // Layer configuration imported
        ]
      },
      // Header navigation (empty for now)
      header: [],
      // User menu configuration
      userMenu: [
        // User profile items from layer (using spread)
        ...userMenuItems,

        // App-specific items
        [{
          label: 'Theme',
          icon: 'i-lucide-palette',
          type: 'theme-selector'  // Special type processed by component
        }, {
          label: 'Appearance',
          icon: 'i-lucide-sun-moon',
          type: 'appearance-selector'  // Special type processed by component
        }],

        // Additional app-specific items
        [{
          label: 'Templates',
          icon: 'i-lucide-layout-template',
          children: [/* ... */]
        }],

        [{
          label: 'Documentation',
          icon: 'i-lucide-book-open',
          to: 'https://ui.nuxt.com',
          target: '_blank'
        }]
      ]
    },
    theme: {
      colors: {
        primary: 'blue',
        neutral: 'slate'
      }
    }
  }
})
```

**Key Characteristics**:
- Imports layer configuration using workspace package name
- Uses **spread operator** (`...userMenuItems`) to compose layer defaults
- Adds app-specific items after layer items
- Nuxt deep merges this with layer's app.config.ts
- Type-safe through module augmentation

### Layer 3: Component Consumption

**File**: `apps/saas/app/components/UserMenu.vue`

```vue
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const appConfig = useAppConfig()
const { signOut, userAttributes } = useUser()

// Read configuration from app.config (single source of truth)
const menuConfig = appConfig.saas?.navigation?.userMenu || []

// Build final items array
const items = computed<DropdownMenuItem[][]>(() => {
  // Start with user label
  const result: DropdownMenuItem[][] = [[{
    type: 'label',
    label: user.value.name,
    avatar: user.value.avatar
  }]]

  // Process each group from app config
  menuConfig.forEach((group: any[]) => {
    const processedGroup = group.map((item: any) => {
      // Replace special types with dynamic content
      if (item.type === 'theme-selector') {
        return themeSelector  // Dynamic component
      }
      if (item.type === 'appearance-selector') {
        return appearanceSelector  // Dynamic component
      }
      return item
    })
    result.push(processedGroup)
  })

  // Add logout at the end
  result.push([{
    label: 'Log out',
    icon: 'i-lucide-log-out',
    onSelect: async () => {
      await signOut()
    }
  }])

  return result
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
  >
    <UButton
      v-bind="user"
      color="neutral"
      variant="ghost"
      block
    />
  </UDropdownMenu>
</template>
```

**Key Characteristics**:
- Reads ONLY from `useAppConfig()` - no direct layer imports
- Single source of truth for navigation configuration
- Can process special types (theme-selector, appearance-selector)
- Adds dynamic items (user info, logout) at runtime

**Similar Pattern in Parent Layouts** (`layers/saas/pages/settings.vue`):

```vue
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { settingsSidebar } from '@starter-nuxt-amplify-saas/saas/config/navigation'

definePageMeta({ middleware: 'auth' })

// Extract title and links from navigation config
const title = computed(() => settingsSidebar.label || 'Settings')
const links = computed(() => [settingsSidebar.children || []] as NavigationMenuItem[][])
</script>

<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar :title="title" />
      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight />
      </UDashboardToolbar>
    </template>
    <template #body>
      <NuxtPage />
    </template>
  </UDashboardPanel>
</template>
```

---

## Consequences

### Positive

**✅ Single Source of Truth**:
- Components always read from `useAppConfig()`
- No configuration duplication
- Consistent navigation across the application

**✅ Type Safety**:
- TypeScript `NavigationMenuItem` type from @nuxt/ui
- Module augmentation for app.config types
- Compile-time validation of configuration

**✅ Layer/App Separation**:
- Layer provides sensible defaults
- Apps customize without modifying layer code
- Clear responsibility boundaries

**✅ Easy Updates**:
- Layer updates propagate automatically
- App customizations preserved
- No merge conflicts

**✅ Build-Time Composition**:
- Configuration resolved at build time
- No runtime overhead
- Optimal performance

### Negative

**⚠️ Static Only**:
- Cannot modify navigation at runtime
- No per-user navigation (without rebuild)
- Mitigation: Use computed properties for dynamic behavior

**⚠️ Learning Curve**:
- Developers must understand 3-layer flow
- Non-obvious without documentation
- Mitigation: This document + examples

**⚠️ Debug Complexity**:
- Navigation issues span multiple files
- Mitigation: Clear naming, good error messages

---

## Examples

### Adding New Navigation Item in Layer

```typescript
// layers/saas/config/navigation.ts
export const settingsSidebar: NavigationMenuItem = {
  // ... existing config
  children: [
    // ... existing children
    {
      label: 'Integrations',  // NEW
      to: '/settings/integrations'
    }
  ]
}
```

**Result**: All apps using this layer get the new menu item automatically.

### Customizing Navigation in App

```typescript
// apps/saas/app/app.config.ts
export default defineAppConfig({
  saas: {
    navigation: {
      userMenu: [
        ...userMenuItems,  // Layer defaults
        [{
          label: 'Admin Panel',  // App-specific item
          icon: 'i-lucide-shield',
          to: '/admin'
        }]
      ]
    }
  }
})
```

**Result**: App gets layer defaults + custom "Admin Panel" item.

### Overriding Layer Navigation

```typescript
// apps/custom/app/app.config.ts
export default defineAppConfig({
  saas: {
    navigation: {
      userMenu: [
        // Don't spread userMenuItems - replace entirely
        [{
          label: 'My Custom Menu',
          to: '/custom'
        }]
      ]
    }
  }
})
```

**Result**: App replaces entire user menu with custom items.

---

## Anti-Patterns

### ❌ Direct Layer Import in Components

```vue
<!-- WRONG: Component imports directly from layer -->
<script setup>
import { userMenuItems } from '@starter-nuxt-amplify-saas/saas/config/navigation'

// This creates duplicate menu items when app.config also spreads userMenuItems
</script>
```

**Why Wrong**: Creates duplicate menu items, bypasses app.config composition.

**Fix**: Always read from `useAppConfig()`.

### ❌ Modifying Layer Config from App

```typescript
// WRONG: Trying to mutate layer config
import { settingsSidebar } from '@starter-nuxt-amplify-saas/saas/config/navigation'

settingsSidebar.children.push({ label: 'New Item' })  // DON'T DO THIS
```

**Why Wrong**: Mutates shared config, affects other apps, not build-time safe.

**Fix**: Use app.config.ts composition to add items.

### ❌ Runtime Navigation Changes

```typescript
// WRONG: Trying to change navigation at runtime
const appConfig = useAppConfig()
appConfig.saas.navigation.userMenu.push([/* ... */])  // Won't work
```

**Why Wrong**: App.config is static/read-only after build.

**Fix**: Use computed properties for dynamic behavior, not configuration changes.

---

## Related Patterns

- **[App.config.ts Composition Pattern](./app-config-composition.pattern.md)** - General pattern for layer/app config
- **[Layers Pattern](./layers.pattern.md)** - Overall Nuxt Layers architecture
- **[SaaS Layer Architecture](../saas-layer.md)** - Complete SaaS layer design

---

## References

- [Nuxt UI Navigation Components](https://ui.nuxt.com/components/navigation)
- [Nuxt App Config](https://nuxt.com/docs/guide/directory-structure/app-config)
- [Nuxt Layers](https://nuxt.com/docs/guide/going-further/layers)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-03 | Document existing 3-layer pattern | Pattern fully implemented but undocumented |
| 2025-12-02 | Use spread operator for composition | Cleaner than manual array concatenation |
| 2025-12-02 | Single source of truth in app.config | Prevents duplicate menu items |
| 2025-12-02 | Static build-time configuration | Performance and type safety |
