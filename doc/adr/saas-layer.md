# ARD: SaaS Meta-Layer Architecture

**Date**: 2025-12-02
**Status**: Approved
**Type**: Architecture Decision Record

---

## Context and Problem Statement

The starter-nuxt-amplify-saas project currently has multiple feature layers (auth, billing, workspaces, entitlements) and foundation layers (amplify, uix, i18n) that applications need to manually compose in their `nuxt.config.ts`. This creates several challenges:

1. **Boilerplate Overhead**: Every app must manually extend 7+ layers in the correct order
2. **Missing Application Shell**: Apps need to create their own dashboard layouts, navigation, and page structure
3. **Inconsistent Patterns**: Different apps may implement similar UI patterns differently
4. **Slow Onboarding**: New apps take hours to set up with proper structure
5. **Configuration Complexity**: No standardized way to customize common SaaS behaviors

**Goal**: Create a meta-layer that aggregates all SaaS layers and provides a complete, production-ready application shell that can be customized via `app.config.ts`.

---

## Decision Drivers

- **Rapid Development**: Enable developers to start a new SaaS app in minutes, not hours
- **Best Practices**: Encode proven SaaS UX patterns into reusable components
- **Flexibility**: Allow apps to override any component, page, or layout when needed
- **Configuration Over Code**: Enable customization without modifying layer source
- **Maintainability**: Keep layer code separate from app-specific customizations
- **Type Safety**: Ensure configuration is type-safe with full TypeScript support

---

## Considered Options

### Option 1: Monolithic Meta-Layer (CHOSEN)

Create a single `@starter-nuxt-amplify-saas/saas` layer that:
- Extends all necessary feature and foundation layers
- Provides complete application shell (layouts, pages, components)
- Offers configuration via `app.config.ts`
- Allows apps to override any part of the layer

**Pros**:
- ✅ Minimal boilerplate - apps extend one layer
- ✅ Consistent SaaS patterns across all apps
- ✅ Complete out-of-the-box experience
- ✅ Easy to update - changes propagate to all apps
- ✅ Clear separation between framework and customization

**Cons**:
- ⚠️ May be too opinionated for some use cases
- ⚠️ Apps need to override components if defaults don't fit
- ⚠️ Larger bundle size (includes all layers)

### Option 2: Configurable Composition Layer

Create a layer that provides utilities to help apps compose their own layer selection:

```typescript
// apps/custom/nuxt.config.ts
import { composeSaasLayers } from '@starter-nuxt-amplify-saas/composer'

export default defineNuxtConfig({
  extends: composeSaasLayers({
    auth: true,
    billing: true,
    workspaces: false,  // Opt-out
    ui: 'minimal'  // Variants
  })
})
```

**Pros**:
- ✅ Fine-grained control over included features
- ✅ Smaller bundle size (only what's needed)

**Cons**:
- ❌ Still requires manual UI implementation
- ❌ More complex configuration API
- ❌ Harder to maintain consistency

### Option 3: Multiple Specialized Meta-Layers

Create multiple meta-layers for different use cases:
- `@starter-nuxt-amplify-saas/saas-full` - Complete SaaS
- `@starter-nuxt-amplify-saas/saas-minimal` - Auth + billing only
- `@starter-nuxt-amplify-saas/saas-multi-tenant` - Full + workspaces

**Pros**:
- ✅ Optimized for specific scenarios

**Cons**:
- ❌ Maintenance overhead (3x layers to update)
- ❌ Confusing for users (which layer to choose?)
- ❌ Harder to keep synchronized

---

## Decision Outcome

**Chosen Option**: **Option 1 - Monolithic Meta-Layer**

**Rationale**:
- Optimizes for the 80% use case: complete SaaS application
- Apps needing custom composition can still extend individual layers
- Configuration system provides flexibility without complexity
- Override system allows full customization when needed
- Single layer simplifies maintenance and updates

**Trade-offs**:
- Apps that need minimal features pay small bundle size cost
- Solution: These apps can compose from individual layers instead
- Opinionated design may not fit all use cases
- Solution: Override system allows complete customization

---

## Architecture Details

### Layer Hierarchy

```
App (apps/saas/)
  ↓ extends
SaaS Meta-Layer (layers/saas/)
  ↓ extends (multiple)
├── Auth Layer (layers/auth/)
├── Billing Layer (layers/billing/)
├── Workspaces Layer (layers/workspaces/)
├── Entitlements Layer (layers/entitlements/)
├── Amplify Layer (layers/amplify/)
├── UIX Layer (layers/uix/)
└── I18n Layer (layers/i18n/)
```

### Component Resolution

Nuxt resolves components, pages, and layouts from layers in priority order (highest to lowest):

```
1. App files (apps/saas/)
2. SaaS Meta-Layer (layers/saas/)
3. Feature Layers (layers/auth/, layers/billing/, etc.)
4. Foundation Layers (layers/amplify/, layers/uix/, layers/i18n/)
```

**Example Resolution**:
```vue
<!-- App wants to use AppHeader -->
<AppHeader />

<!-- Resolution order: -->
1. apps/saas/components/AppHeader.vue     ← Found? Use it
2. layers/saas/components/AppHeader.vue   ← Found? Use it
3. (layers/auth/ through layers/i18n/)    ← Not found in feature layers
```

### Configuration System

**Three-Layer Configuration**:

```typescript
// 1. Layer Defaults (layers/saas/app.config.ts)
export default defineAppConfig({
  saas: {
    brand: { name: 'SaaS App', logo: '/logo.svg' },
    features: { darkMode: true }
  }
})

// 2. App Configuration (apps/saas/app.config.ts)
export default defineAppConfig({
  saas: {
    brand: { name: 'Acme Corp', logo: '/acme-logo.svg' }
    // features.darkMode inherits true from layer
  }
})

// 3. Runtime Access (anywhere in app)
const config = useAppConfig()
console.log(config.saas.brand.name)  // "Acme Corp"
console.log(config.saas.features.darkMode)  // true
```

**Deep Merge Behavior**:
- Objects are deep-merged (app config extends layer config)
- Arrays are replaced (app config overrides layer config)
- Primitives are replaced (app config overrides layer config)

### Directory Structure

```
layers/saas/
├── components/          # Application shell components
│   ├── AppShell.vue        # Main app wrapper
│   ├── AppHeader.vue       # Top navigation bar
│   ├── AppSidebar.vue      # Side navigation menu
│   ├── UserMenu.vue        # User dropdown menu
│   └── WorkspaceSwitcherDropdown.vue
├── layouts/             # Application layouts
│   ├── dashboard.vue       # Authenticated dashboard layout
│   ├── auth.vue           # Public auth pages layout
│   └── onboarding.vue     # First-time user setup layout
├── pages/               # Complete page implementations
│   ├── index.vue           # Dashboard home
│   ├── auth/              # Authentication pages
│   ├── billing/           # Billing pages
│   ├── workspace/         # Workspace management pages
│   └── settings/          # User settings pages
├── composables/         # Layer-specific composables
│   └── useSaasConfig.ts   # Configuration accessor
├── types/               # TypeScript definitions
│   └── saas.ts            # Configuration schema
├── app.config.ts        # Default configuration
├── nuxt.config.ts       # Layer composition
├── package.json         # Layer metadata
└── README.md            # Layer documentation
```

### Configuration Schema

**Type-Safe Configuration** (`types/saas.ts`):

```typescript
export interface SaasConfig {
  // Brand identity
  brand: {
    name: string          // App name
    logo: string          // Logo URL
    description: string   // Meta description
    favicon: string       // Favicon URL
  }

  // Navigation structure
  navigation: {
    sidebar: NavigationItem[][]    // Grouped sidebar items
    header: NavigationItem[]       // Header nav items
    userMenu: NavigationItem[][]   // User menu items
  }

  // Feature toggles
  features: {
    workspaceSwitcher: boolean     // Show workspace switcher
    onboarding: boolean            // Enable onboarding flow
    darkMode: boolean              // Enable dark mode toggle
    multiWorkspace: boolean        // Support multiple workspaces
  }

  // Layout configuration
  layouts: {
    dashboard: {
      sidebarCollapsible: boolean          // Allow sidebar collapse
      sidebarDefaultCollapsed: boolean     // Start collapsed
    }
    auth: {
      showBranding: boolean                // Show logo on auth pages
      showFooter: boolean                  // Show footer links
    }
  }

  // Theme customization
  theme: {
    colors: {
      primary: string     // Primary color (Nuxt UI color name)
      neutral: string     // Neutral color (Nuxt UI color name)
    }
  }
}

export interface NavigationItem {
  label: string         // Display text
  icon?: string         // Iconify icon name
  to?: string           // Navigation route
  click?: () => void    // Click handler
  badge?: string        // Badge text
}
```

### Data Flow

**Configuration Loading**:

```
Build Time:
  ┌─────────────────────────────────────────┐
  │ 1. Load layer default config            │
  │    (layers/saas/app.config.ts)          │
  └────────────────┬────────────────────────┘
                   ↓
  ┌─────────────────────────────────────────┐
  │ 2. Load app config                      │
  │    (apps/saas/app.config.ts)            │
  └────────────────┬────────────────────────┘
                   ↓
  ┌─────────────────────────────────────────┐
  │ 3. Deep merge configs                   │
  │    (app overrides layer)                │
  └────────────────┬────────────────────────┘
                   ↓
  ┌─────────────────────────────────────────┐
  │ 4. Generate type-safe config            │
  │    (available via useAppConfig())       │
  └─────────────────────────────────────────┘

Runtime:
  ┌─────────────────────────────────────────┐
  │ Component needs config                  │
  │   const config = useAppConfig()         │
  └────────────────┬────────────────────────┘
                   ↓
  ┌─────────────────────────────────────────┐
  │ Access merged config                    │
  │   config.saas.brand.name                │
  │   config.saas.features.darkMode         │
  └─────────────────────────────────────────┘
```

**Component Rendering**:

```
Page Request:
  ┌─────────────────────────────────────────┐
  │ 1. Nuxt resolves layout                 │
  │    (dashboard.vue or auth.vue)          │
  └────────────────┬────────────────────────┘
                   ↓
  ┌─────────────────────────────────────────┐
  │ 2. Layout renders AppShell              │
  │    <AppShell> (from saas layer)         │
  └────────────────┬────────────────────────┘
                   ↓
  ┌─────────────────────────────────────────┐
  │ 3. AppShell renders components          │
  │    <AppHeader /> <AppSidebar />         │
  └────────────────┬────────────────────────┘
                   ↓
  ┌─────────────────────────────────────────┐
  │ 4. Components read config               │
  │    const config = useAppConfig()        │
  │    config.saas.navigation.sidebar       │
  └────────────────┬────────────────────────┘
                   ↓
  ┌─────────────────────────────────────────┐
  │ 5. Render navigation items              │
  │    v-for="item in config.navigation"    │
  └─────────────────────────────────────────┘
```

---

## Technical Considerations

### Performance

**Bundle Size**:
- Meta-layer includes all feature layers (~500KB gzipped)
- Apps using meta-layer: Full bundle
- Apps composing manually: Can exclude unused layers

**Optimization Strategies**:
- ✅ Nuxt auto-imports (tree-shaking unused code)
- ✅ Component lazy loading (pages load on demand)
- ✅ Server-side rendering (faster initial load)
- ✅ Route-based code splitting (smaller chunks)

**Benchmarks** (Target):
- First Contentful Paint: < 1.5s
- Total Blocking Time: < 200ms
- Bundle size (main): < 300KB gzipped

### Maintainability

**Layer Updates**:
- Changes to saas layer automatically propagate to all apps
- Breaking changes require semver major version bump
- Configuration schema changes use deprecation warnings

**Override Safety**:
- Apps can override any component without breaking layer
- TypeScript ensures configuration schema compliance
- Layer updates won't break app overrides (components resolve app-first)

**Testing Strategy**:
- E2E tests in saas layer verify complete flows
- Apps can add additional tests for custom overrides
- Visual regression tests catch UI changes

### Scalability

**Multiple Apps**:
- Each app can extend saas layer independently
- Apps can override different components
- Shared components update across all apps

**Custom Composition**:
```typescript
// App that doesn't want full saas layer
export default defineNuxtConfig({
  extends: [
    '@starter-nuxt-amplify-saas/amplify',
    '@starter-nuxt-amplify-saas/auth',
    '@starter-nuxt-amplify-saas/billing',
    // Skip saas meta-layer, build custom UI
  ]
})
```

**Multi-Tenant Scenarios**:
- Single app with multiple brands: Use app.config.ts with environment variables
- Multiple apps for different brands: Each app extends saas layer with custom config

---

## Integration Points

### With Feature Layers

The saas meta-layer **consumes** composables and components from feature layers:

```typescript
// In saas layer components
const { user, signOut } = useUser()           // Auth layer
const { subscription } = useBilling()         // Billing layer
const { currentWorkspace } = useWorkspace()   // Workspaces layer
const { canAccessFeature } = useEntitlements() // Entitlements layer
```

**Dependency Graph**:
```
Saas Layer
  ↓ uses composables from
Auth Layer → useUser(), signIn(), signOut()
Billing Layer → useBilling(), subscription
Workspaces Layer → useWorkspace(), useWorkspaces()
Entitlements Layer → useEntitlements(), canAccessFeature()
```

### With Foundation Layers

The saas meta-layer **uses** infrastructure from foundation layers:

```typescript
// UIX Layer
<UCard>           // Nuxt UI components
<UButton>
<UDropdown>

// I18n Layer
const { t } = useI18n()
t('common.signOut')

// Amplify Layer
const { $Amplify } = useNuxtApp()
```

### With Applications

Applications **extend** the saas meta-layer:

```typescript
// apps/saas/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@starter-nuxt-amplify-saas/saas'  // Extend meta-layer
  ],

  // App-specific configuration
  // ...
})
```

**Override Examples**:

```vue
<!-- Override dashboard home page -->
<!-- apps/saas/pages/index.vue -->
<template>
  <div>
    <h1>Custom Dashboard</h1>
  </div>
</template>

<!-- Override AppHeader component -->
<!-- apps/saas/components/AppHeader.vue -->
<template>
  <header>
    <!-- Custom header implementation -->
  </header>
</template>
```

---

## Migration Path

### For Existing Apps

Apps currently composing individual layers can migrate gradually:

**Step 1**: Add saas meta-layer (parallel to existing layers)
```typescript
export default defineNuxtConfig({
  extends: [
    // Keep existing layers
    '@starter-nuxt-amplify-saas/auth',
    '@starter-nuxt-amplify-saas/billing',
    // ... other layers

    // Add saas layer
    '@starter-nuxt-amplify-saas/saas'
  ]
})
```

**Step 2**: Remove individual layers (saas layer includes them)
```typescript
export default defineNuxtConfig({
  extends: [
    '@starter-nuxt-amplify-saas/saas'  // Replaces all individual layers
  ]
})
```

**Step 3**: Migrate custom UI to use saas layer components
```vue
<!-- Before: Custom header -->
<template>
  <header>
    <!-- Custom implementation -->
  </header>
</template>

<!-- After: Use saas layer AppHeader -->
<template>
  <AppHeader />  <!-- Auto-imported from saas layer -->
</template>
```

**Step 4**: Move customizations to app.config.ts
```typescript
// Before: Hard-coded in components
const appName = 'Acme Corp'
const logo = '/acme-logo.svg'

// After: Configuration
export default defineAppConfig({
  saas: {
    brand: {
      name: 'Acme Corp',
      logo: '/acme-logo.svg'
    }
  }
})
```

### Rollback Strategy

If saas meta-layer doesn't fit, apps can revert to manual composition:

```typescript
// Remove saas layer
export default defineNuxtConfig({
  extends: [
    // Go back to individual layers
    '@starter-nuxt-amplify-saas/amplify',
    '@starter-nuxt-amplify-saas/auth',
    '@starter-nuxt-amplify-saas/billing',
    '@starter-nuxt-amplify-saas/workspaces',
    '@starter-nuxt-amplify-saas/entitlements',
    '@starter-nuxt-amplify-saas/uix',
    '@starter-nuxt-amplify-saas/i18n'
  ]
})
```

No data loss - all layer functionality remains available.

---

## Security Considerations

### Configuration Safety

**Server-Only Secrets**:
- ❌ Never put secrets in `app.config.ts` (exposed to client)
- ✅ Use `nuxt.config.ts runtimeConfig` for secrets

```typescript
// ❌ WRONG - Exposed to client
export default defineAppConfig({
  saas: {
    stripeSecretKey: 'sk_test_xxx'  // NEVER DO THIS
  }
})

// ✅ CORRECT - Server-only
export default defineNuxtConfig({
  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY  // Server-only
  }
})
```

**Configuration Validation**:
- TypeScript ensures type safety at build time
- Runtime validation for user-provided navigation items
- Sanitize any HTML in configuration strings

### Component Security

**Auth Protection**:
```typescript
// All dashboard pages require authentication
definePageMeta({
  middleware: ['auth']
})
```

**Permission Checks**:
```vue
<template>
  <UButton
    v-if="canAccessFeature('advanced-analytics')"
    to="/analytics"
  >
    Analytics
  </UButton>
</template>

<script setup lang="ts">
const { canAccessFeature } = useEntitlements()
</script>
```

**XSS Prevention**:
- All user inputs sanitized via Nuxt UI components
- Navigation labels escaped by Vue automatically
- Custom HTML requires explicit `v-html` (not used)

---

## Monitoring and Observability

### Configuration Debugging

**Development Mode**:
```typescript
// Log merged configuration
if (process.dev) {
  console.log('Saas Config:', useAppConfig().saas)
}
```

**Build-Time Validation**:
```typescript
// nuxt.config.ts hook
hooks: {
  'app:config': (config) => {
    // Validate required configuration
    if (!config.saas?.brand?.name) {
      throw new Error('saas.brand.name is required')
    }
  }
}
```

### Performance Monitoring

**Key Metrics**:
- First Contentful Paint (target: < 1.5s)
- Largest Contentful Paint (target: < 2.5s)
- Time to Interactive (target: < 3s)
- Component render time (target: < 100ms)

**Monitoring Tools**:
- Lighthouse CI for build-time checks
- Web Vitals for production monitoring
- Nuxt DevTools for development analysis

### Error Tracking

**Configuration Errors**:
- Invalid navigation items → console warning
- Missing required config → build error
- Type mismatches → TypeScript error

**Runtime Errors**:
- Component render failures → error boundary
- Navigation failures → fallback UI
- API failures → user-friendly messages

---

## Future Enhancements

### Phase 2: Advanced Customization

**Custom Theme System**:
```typescript
export default defineAppConfig({
  saas: {
    theme: {
      colors: { /* ... */ },
      fonts: { /* ... */ },
      spacing: { /* ... */ }
    }
  }
})
```

**Layout Variants**:
```typescript
export default defineAppConfig({
  saas: {
    layouts: {
      dashboard: {
        variant: 'sidebar-left' | 'sidebar-right' | 'top-nav'
      }
    }
  }
})
```

### Phase 3: Multi-Brand Support

**Brand Profiles**:
```typescript
export default defineAppConfig({
  saas: {
    brands: {
      default: { /* ... */ },
      enterprise: { /* ... */ }
    }
  }
})
```

**Runtime Brand Switching**:
```typescript
const { switchBrand } = useSaasBranding()
await switchBrand('enterprise')
```

### Phase 4: Plugin System

**Third-Party Extensions**:
```typescript
export default defineAppConfig({
  saas: {
    plugins: [
      '@my-company/analytics-plugin',
      '@my-company/chat-plugin'
    ]
  }
})
```

---

## Related Documents

- [PRD: SaaS Meta-Layer](../prd/saas-layer.md)
- [Plan: SaaS Meta-Layer Implementation](../plan/saas-layer.md)
- [ARD: Nuxt Layers Architecture](./patterns/layers.pattern.md)
- [ARD: Configuration System](./patterns/configuration.pattern.md)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-02 | Use monolithic meta-layer over composition utilities | Simpler for 80% use case, apps can still compose manually if needed |
| 2025-12-02 | Configuration via app.config.ts over runtime config | Better type safety and build-time validation |
| 2025-12-02 | Use Nuxt UI (v4) components | Official Nuxt design system, no Pro version in v4 |
| 2025-12-02 | Override via file system over configuration flags | More flexible, follows Nuxt conventions |
