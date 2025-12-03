# Pattern: App.config.ts Composition

**Date**: 2025-12-03
**Status**: Documented
**Type**: Configuration Pattern

---

## Context and Problem Statement

Nuxt layers provide a powerful mechanism for composing applications from reusable functionality. However, layers need a way to provide default configuration while allowing applications to customize that configuration without modifying the layer code.

**Problems to Solve**:
1. How do layers provide sensible default configuration?
2. How do applications customize configuration without editing layer files?
3. How do we prevent configuration duplication?
4. How do we maintain a single source of truth for components?
5. How do we ensure type safety across the configuration chain?

---

## Decision

Implement a **3-Layer Configuration Composition Pattern** using:
1. **Layer Config Modules** - Exportable configuration as TypeScript modules
2. **App.config.ts Composition** - Import and compose using spread operator
3. **Component Consumption** - Read only from `useAppConfig()`

```
Layer Config Module (layers/saas/config/*.ts)
  → Export typed configuration objects
    ↓
App Config (apps/saas/app/app.config.ts)
  → Import layer configuration
  → Compose using spread operator (...config)
  → Add app-specific customizations
  → Nuxt deep merges at build time
    ↓
Component (*.vue)
  → const config = useAppConfig()
  → Read: config.saas.navigation.userMenu
  → Single source of truth
  → No direct layer imports
```

---

## Implementation

### Step 1: Create Layer Configuration Module

**File**: `layers/saas/config/navigation.ts`

```typescript
import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * Settings sidebar menu - workspace-related settings
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
  }]
}

/**
 * Profile sidebar menu - user profile pages
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
 * User menu items (derived from profileSidebar for DRY)
 */
export const userMenuItems: NavigationMenuItem[][] = [
  profileSidebar.children || []
]

/**
 * Footer navigation items
 */
export const footerNavigation: NavigationMenuItem[] = [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/your-repo',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://docs.example.com',
  target: '_blank'
}]
```

**Key Characteristics**:
- **Typed Exports**: Use types from @nuxt/ui for consistency
- **Static Configuration**: Build-time, not runtime
- **Composable**: Items can reference each other (DRY principle)
- **Documented**: JSDoc comments explain purpose

### Step 2: Layer Default App Config

**File**: `layers/saas/app.config.ts`

```typescript
export default defineAppConfig({
  saas: {
    brand: {
      name: 'SaaS App',
      logo: '/logo.svg',
      description: 'A SaaS Application',
      favicon: '/favicon.ico'
    },
    navigation: {
      sidebar: {
        main: [],
        footer: []
      },
      header: [],
      userMenu: []
    },
    features: {
      workspaceSwitcher: true,
      onboarding: false,
      darkMode: true,
      multiWorkspace: true
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

**Purpose**: Provide minimal defaults, apps will compose on top of this.

### Step 3: App Configuration Composition

**File**: `apps/saas/app/app.config.ts`

```typescript
import {
  settingsSidebar,
  footerNavigation,
  userMenuItems
} from '@starter-nuxt-amplify-saas/saas/config/navigation'

export default defineAppConfig({
  saas: {
    // Brand customization
    brand: {
      name: 'Acme SaaS',
      logo: '/acme-logo.svg',
      description: 'Acme SaaS Platform',
      favicon: '/acme-favicon.ico'
    },

    // Navigation composition
    navigation: {
      sidebar: {
        main: [[
          {
            label: 'Home',
            icon: 'i-lucide-house',
            to: '/'
          },
          {
            label: 'Inbox',
            icon: 'i-lucide-inbox',
            to: '/inbox',
            badge: '4'
          },
          {
            label: 'Customers',
            icon: 'i-lucide-users',
            to: '/customers'
          },
          settingsSidebar  // Import from layer
        ]],
        footer: [
          footerNavigation  // Import from layer
        ]
      },

      header: [],

      userMenu: [
        // Spread layer defaults
        ...userMenuItems,

        // Add app-specific items
        [{
          label: 'Theme',
          icon: 'i-lucide-palette',
          type: 'theme-selector'
        }, {
          label: 'Appearance',
          icon: 'i-lucide-sun-moon',
          type: 'appearance-selector'
        }],

        [{
          label: 'Documentation',
          icon: 'i-lucide-book-open',
          to: 'https://docs.acme.com',
          target: '_blank'
        }]
      ]
    },

    // Feature toggles
    features: {
      workspaceSwitcher: true,
      onboarding: true,
      darkMode: true,
      multiWorkspace: true
    },

    // Theme customization
    theme: {
      colors: {
        primary: 'purple',
        neutral: 'gray'
      }
    }
  }
})
```

**Key Patterns**:
- **Import from layer** using workspace package name
- **Spread operator** (`...userMenuItems`) to compose arrays
- **Object properties** override layer defaults (deep merge)
- **Arrays** replace entirely (no merge, just override)

### Step 4: Type Safety with Module Augmentation

**File**: `layers/saas/types/saas-config.ts`

```typescript
import type { NavigationMenuItem } from '@nuxt/ui'

export interface SaasConfig {
  brand: {
    name: string
    logo: string
    description: string
    favicon: string
  }
  navigation: {
    sidebar: {
      main: NavigationMenuItem[][]
      footer: NavigationMenuItem[]
    }
    header: NavigationMenuItem[]
    userMenu: NavigationMenuItem[][]
  }
  features: {
    workspaceSwitcher: boolean
    onboarding: boolean
    darkMode: boolean
    multiWorkspace: boolean
  }
  theme: {
    colors: {
      primary: string
      neutral: string
    }
  }
}

declare module 'nuxt/schema' {
  interface AppConfigInput {
    saas?: Partial<SaasConfig>
  }
  interface AppConfig {
    saas: SaasConfig
  }
}

export {}
```

**Benefits**:
- TypeScript autocomplete in app.config.ts
- Compile-time validation
- IDE support

### Step 5: Component Consumption

**File**: `components/UserMenu.vue`

```vue
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const appConfig = useAppConfig()
const { signOut, userAttributes } = useUser()

// ✅ CORRECT: Read from app.config (single source of truth)
const menuConfig = appConfig.saas?.navigation?.userMenu || []

// Process configuration
const items = computed<DropdownMenuItem[][]>(() => {
  const result: DropdownMenuItem[][] = [[{
    type: 'label',
    label: user.value.name,
    avatar: user.value.avatar
  }]]

  // Process each group from app config
  menuConfig.forEach((group: any[]) => {
    const processedGroup = group.map((item: any) => {
      // Handle special types
      if (item.type === 'theme-selector') {
        return themeSelector
      }
      if (item.type === 'appearance-selector') {
        return appearanceSelector
      }
      return item
    })
    result.push(processedGroup)
  })

  // Add logout
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
  <UDropdownMenu :items="items">
    <!-- ... -->
  </UDropdownMenu>
</template>
```

**Key Points**:
- **Single Source**: Only reads from `useAppConfig()`
- **No Layer Imports**: Never import config directly from layer
- **Runtime Processing**: Can transform config items (e.g., special types)

---

## Nuxt Deep Merge Behavior

When multiple layers and app provide app.config.ts, Nuxt deep merges them:

```typescript
// Layer provides:
{
  saas: {
    brand: { name: 'SaaS App', logo: '/logo.svg' },
    features: { darkMode: true }
  }
}

// App provides:
{
  saas: {
    brand: { name: 'Acme' },  // Override name, keep logo
    navigation: { ... }  // Add new property
  }
}

// Result (deep merged):
{
  saas: {
    brand: { name: 'Acme', logo: '/logo.svg' },  // Merged
    features: { darkMode: true },  // Inherited
    navigation: { ... }  // Added
  }
}
```

**Merge Rules**:
- **Objects**: Deep merge (app overrides layer, keeps other properties)
- **Arrays**: Replace entirely (no merge)
- **Primitives**: Replace (app overrides layer)

---

## Consequences

### Positive

**✅ Separation of Concerns**:
- Layer provides sensible defaults
- App customizes without modifying layer
- Components have single source of truth

**✅ Type Safety**:
- TypeScript interfaces for configuration
- Module augmentation for app.config
- Compile-time validation

**✅ DRY Principle**:
- Configuration defined once
- Reused via imports
- No duplication

**✅ Maintainability**:
- Layer updates propagate automatically
- App overrides preserved
- Clear ownership boundaries

**✅ Flexibility**:
- Apps can use layer defaults
- Apps can override anything
- Apps can add new items

### Negative

**⚠️ Build-Time Only**:
- Configuration resolved at build time
- Cannot modify at runtime
- Mitigation: Use computed properties for dynamic behavior

**⚠️ Learning Curve**:
- Developers must understand composition pattern
- Spread operator not obvious without documentation
- Mitigation: This document + examples

**⚠️ Debug Complexity**:
- Configuration spans multiple files
- Deep merge can be non-obvious
- Mitigation: Use Nuxt DevTools to inspect merged config

---

## Examples

### Example 1: Add Custom Navigation Item

```typescript
// apps/saas/app/app.config.ts
import { userMenuItems } from '@starter-nuxt-amplify-saas/saas/config/navigation'

export default defineAppConfig({
  saas: {
    navigation: {
      userMenu: [
        ...userMenuItems,  // Layer defaults
        [{
          label: 'Admin Panel',  // App-specific
          icon: 'i-lucide-shield',
          to: '/admin'
        }]
      ]
    }
  }
})
```

### Example 2: Override Layer Default

```typescript
// apps/saas/app/app.config.ts
export default defineAppConfig({
  saas: {
    brand: {
      name: 'Custom Brand'  // Overrides layer default
      // logo, description, favicon inherited from layer
    }
  }
})
```

### Example 3: Replace Entire Configuration Section

```typescript
// apps/saas/app/app.config.ts
export default defineAppConfig({
  saas: {
    navigation: {
      userMenu: [
        // Don't spread userMenuItems - replace entirely
        [{
          label: 'Custom Menu',
          to: '/custom'
        }]
      ]
    }
  }
})
```

---

## Anti-Patterns

### ❌ Direct Layer Import in Components

```vue
<!-- WRONG -->
<script setup>
import { userMenuItems } from '@starter-nuxt-amplify-saas/saas/config/navigation'
// This bypasses app.config and creates duplication
</script>
```

**Fix**: Always read from `useAppConfig()`.

### ❌ Modifying Layer Config from App

```typescript
// WRONG
import { settingsSidebar } from '@starter-nuxt-amplify-saas/saas/config/navigation'
settingsSidebar.children.push({ label: 'New' })  // Mutates shared config
```

**Fix**: Use app.config.ts composition to extend.

### ❌ Runtime Configuration Changes

```typescript
// WRONG
const appConfig = useAppConfig()
appConfig.saas.navigation.userMenu.push([])  // Won't work, config is read-only
```

**Fix**: Use computed properties for dynamic behavior.

---

## Related Patterns

- **[Navigation Configuration Pattern](./navigation-config.pattern.md)** - Specific application of this pattern
- **[Layers Pattern](./layers.pattern.md)** - Overall Nuxt Layers architecture
- **[SaaS Layer Architecture](../saas-layer.md)** - Usage in SaaS meta-layer

---

## References

- [Nuxt App Config](https://nuxt.com/docs/guide/directory-structure/app-config)
- [Nuxt Layers](https://nuxt.com/docs/guide/going-further/layers)
- [TypeScript Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-03 | Document existing composition pattern | Pattern fully implemented but undocumented |
| 2025-12-02 | Use spread operator for arrays | Cleaner than manual concatenation |
| 2025-12-02 | Export config as modules | Better than app.config exports (tree-shakeable) |
| 2025-12-02 | Single source of truth in useAppConfig() | Prevents duplication and inconsistency |
