# PRD: SaaS Meta-Layer

**Date**: 2025-12-02
**Status**: Draft
**Type**: Nuxt Layer (Meta-Layer)

---

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
- [2. User Experience](#2-user-experience)
  - [2.1 Application Shell](#21-application-shell)
  - [2.2 Navigation Patterns](#22-navigation-patterns)
  - [2.3 Layout System](#23-layout-system)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Layer Composition](#31-layer-composition)
  - [3.2 Configuration System](#32-configuration-system)
  - [3.3 Layouts](#33-layouts)
  - [3.4 Pages](#34-pages)
  - [3.5 Components](#35-components)
- [4. Configuration](#4-configuration)
  - [4.1 App Config Schema](#41-app-config-schema)
  - [4.2 Configuration Examples](#42-configuration-examples)
  - [4.3 Override Patterns](#43-override-patterns)
- [5. Testing](#5-testing)
  - [5.1 E2E Tests](#51-e2e-tests)
  - [5.2 Visual Regression](#52-visual-regression)
- [6. Implementation](#6-implementation)
  - [6.1 Layer Structure](#61-layer-structure)
  - [6.2 Definition of Done](#62-definition-of-done)
  - [6.3 Implementation Plan](#63-implementation-plan)
- [7. Non-Functional Requirements](#7-non-functional-requirements)

---

## 1. Overview

### 1.1 Purpose

The **SaaS Meta-Layer** is an aggregation layer that provides a complete, ready-to-use SaaS application foundation by composing all necessary feature layers (auth, billing, workspaces, entitlements, etc.) and adding a professional application shell with layouts, pages, navigation, and UI components.

**Design Philosophy**:
- **Rapid Development**: Get a fully functional SaaS dashboard in minutes
- **Configuration Over Code**: Customize via `app.config.ts` without modifying layer code
- **Flexibility**: Apps can still compose from underlying layers if full meta-layer is too opinionated
- **Best Practices**: Implements proven SaaS patterns and UX conventions

### 1.2 Scope

**✅ Includes**:
- Layer composition extending all SaaS feature layers
- Professional dashboard layout with sidebar navigation
- Authentication pages (login, register, forgot password, reset password)
- Core dashboard pages (home, billing, workspace, settings)
- Navigation system (sidebar, header, user menu, workspace switcher)
- Complete UI components built with Nuxt UI (v4)
- Configuration-driven customization via app.config.ts
- Dark mode support
- Responsive design for mobile/tablet/desktop
- Onboarding flow integration

**❌ Excludes**:
- Business-specific features (e.g., inventory, booking, CRM)
- Custom integrations beyond the core SaaS stack
- Advanced theming beyond Nuxt UI color customization
- Multi-brand white-labeling (future enhancement)

### 1.3 Key Requirements

**Functional Requirements**:
- **Complete Layer Composition**: Extends all necessary layers (auth, billing, workspaces, entitlements, amplify, uix, i18n)
- **Application Shell**: Professional dashboard layout with collapsible sidebar, header, and content area
- **Navigation System**: Configurable menu structure via app.config.ts
- **Authentication Pages**: Full auth flow UI (login, register, password reset)
- **Dashboard Pages**: Home, billing, workspace management, user settings
- **Component Library**: Pre-built components for common SaaS patterns
- **Workspace Switcher**: Dropdown to switch between user's workspaces
- **User Menu**: Profile, settings, workspace, sign out actions
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark Mode**: Full dark mode support via Nuxt UI theming

**Configuration Requirements**:
- **Brand Customization**: Logo, app name, description, favicon
- **Navigation Configuration**: Add/remove/reorder menu items
- **Feature Toggles**: Enable/disable specific features (workspace switcher, onboarding, dark mode)
- **Layout Configuration**: Dashboard vs auth layout customization
- **Theme Configuration**: Primary/neutral color customization

**Non-Functional Requirements**:
- **Performance**: First Contentful Paint < 1.5s
- **Accessibility**: WCAG 2.1 AA compliance
- **SEO**: Proper meta tags and OpenGraph configuration
- **Mobile Performance**: Lighthouse mobile score > 90

---

## 2. User Experience

### 2.1 Application Shell

The SaaS meta-layer provides a complete application shell that combines all SaaS features into a cohesive user experience.

**Layout Structure**:
```
┌──────────────────────────────────────────────────┐
│ Header (AppHeader)                               │
│  Logo | Workspace Switcher | Search | UserMenu  │
├────────┬─────────────────────────────────────────┤
│        │                                         │
│ Side   │  Main Content Area                      │
│ bar    │  (Page Content)                         │
│ (App   │                                         │
│ Side   │                                         │
│ bar)   │                                         │
│        │                                         │
└────────┴─────────────────────────────────────────┘
```

**Responsive Behavior**:
- **Desktop (≥1024px)**: Persistent sidebar, full header
- **Tablet (768px-1023px)**: Collapsible sidebar, compact header
- **Mobile (<768px)**: Hidden sidebar (hamburger menu), minimal header

### 2.2 Navigation Patterns

**Primary Navigation (Sidebar)**:
- Dashboard home
- Workspace section (team, members, settings)
- Billing section (subscription, plans, invoices)
- Settings section (profile, account, security)

**Secondary Navigation (Header)**:
- Workspace switcher dropdown
- Global search (future)
- Notifications (future)
- User menu

**User Menu Actions**:
- View/edit profile
- Account settings
- Switch workspace (if multiple)
- Manage subscription
- Sign out

### 2.3 Layout System

**Dashboard Layout** (`layouts/dashboard.vue`):
- Used for authenticated pages
- Includes AppHeader, AppSidebar, main content area
- Handles workspace context
- Shows workspace switcher if user has multiple workspaces

**Auth Layout** (`layouts/auth.vue`):
- Used for authentication pages
- Centered content with branding
- No navigation
- Minimal footer with links

**Onboarding Layout** (`layouts/onboarding.vue`):
- Used for first-time user setup
- Step indicator
- Progress tracking
- Skip option

---

## 3. Technical Specifications

### 3.1 Layer Composition

The SaaS meta-layer extends all necessary feature layers to provide complete SaaS functionality.

**Layer Dependencies** (`nuxt.config.ts`):
```typescript
export default defineNuxtConfig({
  extends: [
    // Foundation layers
    '@starter-nuxt-amplify-saas/amplify',
    '@starter-nuxt-amplify-saas/uix',
    '@starter-nuxt-amplify-saas/i18n',

    // Feature layers
    '@starter-nuxt-amplify-saas/auth',
    '@starter-nuxt-amplify-saas/billing',
    '@starter-nuxt-amplify-saas/workspaces',
    '@starter-nuxt-amplify-saas/entitlements',
  ],

  // Saas-specific configuration
  // ...
})
```

**Why This Composition**:
- **Foundation First**: amplify, uix, i18n provide base infrastructure
- **Feature Layers**: auth, billing, workspaces, entitlements provide business capabilities
- **Meta-Layer**: Orchestrates all layers and adds application shell

**Apps Using Meta-Layer**:
```typescript
// apps/saas/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@starter-nuxt-amplify-saas/saas',  // Single meta-layer extension
  ],

  // App-specific overrides
  // ...
})
```

**Apps Not Using Meta-Layer** (Custom Composition):
```typescript
// apps/custom/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    // Compose only needed layers
    '@starter-nuxt-amplify-saas/amplify',
    '@starter-nuxt-amplify-saas/auth',
    '@starter-nuxt-amplify-saas/billing',
    // Skip workspaces, entitlements, saas shell
  ],

  // Build custom UI from scratch
  // ...
})
```

### 3.2 Configuration System

The saas meta-layer is designed to be configuration-driven, allowing apps to customize behavior without modifying layer code.

**Configuration Philosophy**:
- **Sensible Defaults**: Works out-of-the-box with zero configuration
- **Progressive Enhancement**: Add configuration as needed
- **Type Safety**: Full TypeScript support for configuration schema
- **Override Flexibility**: Apps can override components, pages, layouts

**Configuration Layers**:
1. **Layer Defaults** (`layers/saas/app.config.ts`) - Base configuration
2. **App Config** (`apps/saas/app.config.ts`) - App-specific overrides
3. **Runtime Config** (`nuxt.config.ts runtimeConfig`) - Environment variables

**Configuration Priority** (highest to lowest):
```
App Config > Layer Config > Built-in Defaults
```

### 3.3 Layouts

**Dashboard Layout** (`layouts/dashboard.vue`):

```vue
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <AppHeader />

    <div class="flex">
      <!-- Sidebar -->
      <AppSidebar />

      <!-- Main Content -->
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// Enforce authentication
definePageMeta({
  middleware: ['auth']
})

// Load workspace context
const { currentWorkspace } = useWorkspace()
const { user } = useUser()
</script>
```

**Auth Layout** (`layouts/auth.vue`):

```vue
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="w-full max-w-md">
      <!-- Branding -->
      <div class="text-center mb-8">
        <img :src="config.brand.logo" :alt="config.brand.name" class="h-12 mx-auto mb-4" />
        <h1 class="text-2xl font-bold">{{ config.brand.name }}</h1>
      </div>

      <!-- Content -->
      <UCard>
        <slot />
      </UCard>

      <!-- Footer -->
      <p class="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
        <NuxtLink to="/privacy">Privacy</NuxtLink> ·
        <NuxtLink to="/terms">Terms</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()

// Redirect if already authenticated
definePageMeta({
  middleware: ['guest']
})
</script>
```

### 3.4 Pages

The saas meta-layer provides complete page implementations for all core SaaS flows.

**Page Structure**:
```
pages/
├── index.vue                    # Dashboard home
├── auth/
│   ├── login.vue               # Login page
│   ├── register.vue            # Registration page
│   ├── forgot-password.vue     # Password reset request
│   └── reset-password.vue      # Password reset confirmation
├── billing/
│   ├── index.vue               # Current subscription
│   ├── plans.vue               # Available plans
│   └── invoices.vue            # Billing history
├── workspace/
│   ├── index.vue               # Workspace settings
│   ├── members.vue             # Team members
│   └── invitations.vue         # Pending invitations
├── settings/
│   ├── profile.vue             # User profile
│   ├── account.vue             # Account settings
│   └── security.vue            # Security settings
└── onboarding.vue              # First-time user setup
```

**Example: Dashboard Home** (`pages/index.vue`):

```vue
<template>
  <div>
    <UPageHeader
      :title="`Welcome, ${user?.attributes?.name || user?.username}`"
      :description="`${currentWorkspace?.name} workspace`"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      <!-- Quick Stats -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Subscription</h3>
        </template>
        <p class="text-2xl font-bold">{{ subscription?.plan?.name || 'Free' }}</p>
        <p class="text-sm text-gray-600">Current plan</p>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">Team Members</h3>
        </template>
        <p class="text-2xl font-bold">{{ workspaceMembers?.length || 0 }}</p>
        <p class="text-sm text-gray-600">Active members</p>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">Workspace</h3>
        </template>
        <p class="text-2xl font-bold">{{ currentWorkspace?.name }}</p>
        <p class="text-sm text-gray-600">Current workspace</p>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <div class="mt-8">
      <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UButton to="/workspace/members" size="lg" block>
          <UIcon name="i-lucide-users" class="mr-2" />
          Invite Team Members
        </UButton>
        <UButton to="/billing/plans" variant="outline" size="lg" block>
          <UIcon name="i-lucide-zap" class="mr-2" />
          Upgrade Plan
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const { user } = useUser()
const { currentWorkspace } = useWorkspace()
const { workspaceMembers } = useWorkspaceMembers()
const { subscription } = useBilling()
</script>
```

**Example: Login Page** (`pages/auth/login.vue`):

```vue
<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Sign In</h2>

    <form @submit.prevent="handleLogin">
      <UFormGroup label="Email" class="mb-4">
        <UInput
          v-model="credentials.username"
          type="email"
          placeholder="you@example.com"
          required
        />
      </UFormGroup>

      <UFormGroup label="Password" class="mb-4">
        <UInput
          v-model="credentials.password"
          type="password"
          placeholder="••••••••"
          required
        />
      </UFormGroup>

      <div class="flex items-center justify-between mb-6">
        <UCheckbox v-model="rememberMe" label="Remember me" />
        <NuxtLink to="/auth/forgot-password" class="text-sm text-primary">
          Forgot password?
        </NuxtLink>
      </div>

      <UButton type="submit" :loading="isLoading" block size="lg">
        Sign In
      </UButton>
    </form>

    <p class="text-center text-sm mt-6">
      Don't have an account?
      <NuxtLink to="/auth/register" class="text-primary font-medium">
        Sign up
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const { signIn } = useUser()
const router = useRouter()

const credentials = ref({
  username: '',
  password: ''
})
const rememberMe = ref(false)
const isLoading = ref(false)

async function handleLogin() {
  isLoading.value = true
  try {
    await signIn(credentials.value)
    router.push('/')
  } catch (error) {
    console.error('Login failed:', error)
    // Error handling via toast (from uix layer)
  } finally {
    isLoading.value = false
  }
}
</script>
```

### 3.5 Components

The saas meta-layer provides reusable components for common SaaS patterns.

**Core Components**:

**AppShell** (`components/AppShell.vue`):
- Main application wrapper
- Coordinates AppHeader, AppSidebar, content
- Handles responsive behavior

**AppHeader** (`components/AppHeader.vue`):
```vue
<template>
  <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between px-4 h-16">
      <!-- Left: Logo & Workspace Switcher -->
      <div class="flex items-center gap-4">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img :src="config.brand.logo" :alt="config.brand.name" class="h-8" />
          <span class="font-semibold text-lg hidden md:inline">{{ config.brand.name }}</span>
        </NuxtLink>

        <WorkspaceSwitcherDropdown v-if="config.features.workspaceSwitcher" />
      </div>

      <!-- Right: Search, Notifications, User Menu -->
      <div class="flex items-center gap-4">
        <!-- Global Search (future) -->
        <!-- <UButton icon="i-lucide-search" variant="ghost" /> -->

        <!-- Notifications (future) -->
        <!-- <UButton icon="i-lucide-bell" variant="ghost" /> -->

        <UserMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const config = useAppConfig()
</script>
```

**AppSidebar** (`components/AppSidebar.vue`):
```vue
<template>
  <aside class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-16 overflow-y-auto">
    <nav class="p-4">
      <ul class="space-y-2">
        <li v-for="item in navigation" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary text-white"
          >
            <UIcon :name="item.icon" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const config = useAppConfig()
const navigation = computed(() => config.navigation.main.flat())
</script>
```

**UserMenu** (`components/UserMenu.vue`):
```vue
<template>
  <UDropdown :items="menuItems">
    <UButton variant="ghost" class="flex items-center gap-2">
      <UAvatar :src="user?.attributes?.picture" :alt="userName" size="sm" />
      <span class="hidden md:inline">{{ userName }}</span>
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
    </UButton>
  </UDropdown>
</template>

<script setup lang="ts">
const { user, signOut } = useUser()
const router = useRouter()

const userName = computed(() =>
  user.value?.attributes?.name ||
  user.value?.username ||
  'User'
)

const menuItems = [
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
      to: '/settings/profile'
    },
    {
      label: 'Account Settings',
      icon: 'i-lucide-settings',
      to: '/settings/account'
    },
    {
      label: 'Workspace',
      icon: 'i-lucide-building',
      to: '/workspace'
    }
  ],
  [
    {
      label: 'Billing',
      icon: 'i-lucide-credit-card',
      to: '/billing'
    }
  ],
  [
    {
      label: 'Sign Out',
      icon: 'i-lucide-log-out',
      click: async () => {
        await signOut()
        router.push('/auth/login')
      }
    }
  ]
]
</script>
```

**WorkspaceSwitcherDropdown** (`components/WorkspaceSwitcherDropdown.vue`):
```vue
<template>
  <UDropdown :items="workspaceItems">
    <UButton variant="outline" class="flex items-center gap-2">
      <UIcon name="i-lucide-building" />
      <span>{{ currentWorkspace?.name || 'Select Workspace' }}</span>
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
    </UButton>
  </UDropdown>
</template>

<script setup lang="ts">
const { workspaces, currentWorkspace, switchWorkspace } = useWorkspaces()

const workspaceItems = computed(() => [
  workspaces.value?.map(ws => ({
    label: ws.name,
    icon: ws.isPersonal ? 'i-lucide-user' : 'i-lucide-users',
    click: () => switchWorkspace(ws.id)
  })) || [],
  [
    {
      label: 'Create Workspace',
      icon: 'i-lucide-plus',
      to: '/workspace/create'
    }
  ]
])
</script>
```

### 3.6 Settings and Profile Architecture

The SaaS meta-layer provides a standardized architecture for settings and profile pages that clearly separates workspace-level configuration from user-level configuration.

**Design Philosophy**:
- **Clear Separation**: Workspace settings affect all team members; profile settings affect only the current user
- **Proper Scoping**: Workspace settings require workspace context; profile settings work across all workspaces
- **Consistent UX**: Both use parent layout pattern with horizontal navigation
- **Multi-Tenancy**: Proper separation prevents data leaks and maintains security boundaries

#### Workspace Settings (`/settings/*`)

**Purpose**: Configure workspace-level settings that affect all team members

**Pages**:

| Page | Route | Description | Access |
|------|-------|-------------|--------|
| General | `/settings` | Workspace name, logo, description | Owner/Admin |
| Members | `/settings/members` | Team member management | Owner/Admin |
| Billing | `/settings/billing` | Workspace subscription and billing | Owner/Admin |
| Workspaces | `/settings/workspaces` | Workspace switcher and list | All Members |

**Location**: `layers/saas/pages/settings/`

**Access Control**:
- Most pages require workspace owner or admin role
- Uses workspace context from `useWorkspace()` composable
- Permissions checked via `useWorkspaceMembership()` composable

**Parent Layout Pattern** (`layers/saas/pages/settings.vue`):

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
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
```

**Child Page Pattern** (`layers/saas/pages/settings/index.vue`):

```vue
<script setup lang="ts">
const { currentWorkspace } = useWorkspaces()
const { isAdminOrOwner } = useWorkspaceMembership()
</script>

<template>
  <UPageCard
    title="Workspace Settings"
    description="Manage your workspace name, logo, and general settings."
  >
    <WorkspaceGeneralForm />
  </UPageCard>
</template>
```

**Navigation Integration**:
- Settings appears in sidebar menu as collapsible section
- Configured via `settingsSidebar` in `layers/saas/config/navigation.ts`
- Visible to all workspace members

#### User Profile (`/profile/*`)

**Purpose**: Configure user-level settings that affect only the current user

**Pages**:

| Page | Route | Description | Access |
|------|-------|-------------|--------|
| Profile | `/profile` | User name, avatar, bio | Current User |
| Account | `/profile/account` | Email, password, delete account | Current User |
| Security | `/profile/security` | 2FA, sessions, security logs | Current User |
| Notifications | `/profile/notifications` | Notification preferences | Current User |

**Location**: `layers/saas/pages/profile/`

**Access Control**:
- Any authenticated user can access their own profile
- No workspace context required (user-scoped)
- Uses `useUser()` composable for user data

**Parent Layout Pattern** (`layers/saas/pages/profile.vue`):

```vue
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { profileSidebar } from '@starter-nuxt-amplify-saas/saas/config/navigation'

definePageMeta({ middleware: 'auth' })

// Extract title and links from navigation config
const title = computed(() => `${profileSidebar.label} Settings`)
const links = computed(() => [profileSidebar.children || []] as NavigationMenuItem[][])
</script>

<template>
  <UDashboardPanel id="profile" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
```

**Child Page Pattern** (`layers/saas/pages/profile/index.vue`):

```vue
<script setup lang="ts">
const { userAttributes, userProfile } = useUser()
</script>

<template>
  <UPageCard
    title="Profile"
    description="Manage your personal information and preferences."
  >
    <UserProfileSettings />
  </UPageCard>
</template>
```

**Navigation Integration**:
- Profile items appear in user menu (footer of sidebar)
- Configured via `profileSidebar` → `userMenuItems` in `layers/saas/config/navigation.ts`
- Visible only to current user

#### Component Distribution

**Workspace-Specific Components** → `layers/workspaces/components/`:
- `WorkspaceGeneralForm.vue` - Edit workspace details
- `CreateWorkspaceModal.vue` - Create new workspace
- `TeamMembersList.vue` - Manage team members
- **Rule**: Components with workspace domain logic belong in workspaces layer

**User-Specific Components** → `layers/auth/components/`:
- `UserAccountForm.vue` - Edit user account settings
- `UserProfileSettings.vue` - Edit user profile information
- **Rule**: Components with user/auth domain logic belong in auth layer

**Generic Shell Components** → `layers/saas/components/`:
- `UserMenu.vue` - User dropdown menu (shell component)
- `AppHeader.vue` - Application header (shell component)
- `AppSidebar.vue` - Application sidebar (shell component)
- **Rule**: Only generic shell components with no domain logic

**Anti-Patterns to Avoid**:
- ❌ Domain components in saas layer (WorkspaceGeneralForm should NOT be in `layers/saas/components/`)
- ❌ Mixed workspace/user settings in single route (keep `/settings` and `/profile` separate)
- ❌ Inconsistent navigation patterns (always use parent layout with UDashboardToolbar)

#### Design Rationale

**Separation of Concerns**:
- Workspace settings affect team → require workspace context and permissions
- Profile settings affect individual → work across all workspaces, no workspace context
- Clear mental model for users: "Settings" for team, "Profile" for me

**Multi-Tenancy**:
- Workspace settings are workspace-scoped (data isolation per workspace)
- Profile settings are user-scoped (same across all workspaces)
- Proper scoping prevents data leaks and maintains security boundaries

**Component Organization**:
- Domain components live in feature layers (workspaces, auth)
- Generic shell components live in saas layer
- Clear boundaries prevent circular dependencies and coupling

**User Experience**:
- Consistent horizontal navigation pattern for both settings and profile
- Parent layouts provide structure, child pages provide content
- `UPageCard` wrapper for consistent styling across all pages

---

## 4. Configuration

### 4.1 App Config Schema

The saas meta-layer uses `app.config.ts` for configuration. This file is type-safe and merged at build time.

**Configuration Schema** (`layers/saas/app.config.ts`):

```typescript
export interface SaasConfig {
  brand: {
    name: string
    logo: string
    description: string
    favicon: string
  }
  navigation: {
    sidebar: NavigationItem[][]  // Grouped navigation items
    header: NavigationItem[]
    userMenu: NavigationItem[][]
  }
  features: {
    workspaceSwitcher: boolean
    onboarding: boolean
    darkMode: boolean
    multiWorkspace: boolean
  }
  layouts: {
    dashboard: {
      sidebarCollapsible: boolean
      sidebarDefaultCollapsed: boolean
    }
    auth: {
      showBranding: boolean
      showFooter: boolean
    }
  }
  theme: {
    colors: {
      primary: string
      neutral: string
    }
  }
}

export interface NavigationItem {
  label: string
  icon?: string
  to?: string
  click?: () => void
  badge?: string
}
```

**Default Configuration** (`layers/saas/app.config.ts`):

```typescript
export default defineAppConfig({
  saas: {
    brand: {
      name: 'SaaS App',
      logo: '/logo.svg',
      description: 'Professional SaaS Application',
      favicon: '/favicon.ico'
    },
    navigation: {
      sidebar: [
        [
          { label: 'Dashboard', icon: 'i-lucide-home', to: '/' }
        ],
        [
          { label: 'Workspace', icon: 'i-lucide-building', to: '/workspace' },
          { label: 'Team Members', icon: 'i-lucide-users', to: '/workspace/members' }
        ],
        [
          { label: 'Billing', icon: 'i-lucide-credit-card', to: '/billing' },
          { label: 'Plans', icon: 'i-lucide-zap', to: '/billing/plans' }
        ],
        [
          { label: 'Settings', icon: 'i-lucide-settings', to: '/settings/profile' }
        ]
      ],
      header: [],
      userMenu: [
        [
          { label: 'Profile', icon: 'i-lucide-user', to: '/settings/profile' },
          { label: 'Account', icon: 'i-lucide-settings', to: '/settings/account' }
        ],
        [
          { label: 'Billing', icon: 'i-lucide-credit-card', to: '/billing' }
        ]
      ]
    },
    features: {
      workspaceSwitcher: true,
      onboarding: true,
      darkMode: true,
      multiWorkspace: true
    },
    layouts: {
      dashboard: {
        sidebarCollapsible: true,
        sidebarDefaultCollapsed: false
      },
      auth: {
        showBranding: true,
        showFooter: true
      }
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

### 4.2 Configuration Examples

**Example 1: Custom Branding**

```typescript
// apps/saas/app.config.ts
export default defineAppConfig({
  saas: {
    brand: {
      name: 'Acme Corp',
      logo: '/acme-logo.svg',
      description: 'Acme SaaS Platform',
      favicon: '/acme-favicon.ico'
    }
  }
})
```

**Example 2: Custom Navigation**

```typescript
// apps/saas/app.config.ts
export default defineAppConfig({
  saas: {
    navigation: {
      sidebar: [
        [
          { label: 'Dashboard', icon: 'i-lucide-home', to: '/' },
          { label: 'Projects', icon: 'i-lucide-folder', to: '/projects' }  // Custom page
        ],
        [
          { label: 'Team', icon: 'i-lucide-users', to: '/workspace/members' },
          { label: 'Billing', icon: 'i-lucide-credit-card', to: '/billing' }
        ],
        [
          { label: 'Settings', icon: 'i-lucide-settings', to: '/settings/profile' }
        ]
      ]
    }
  }
})
```

**Example 3: Disable Features**

```typescript
// apps/saas/app.config.ts
export default defineAppConfig({
  saas: {
    features: {
      workspaceSwitcher: false,  // Hide workspace switcher (single-tenant app)
      onboarding: false,         // Skip onboarding flow
      darkMode: true,            // Keep dark mode
      multiWorkspace: false      // Disable multi-workspace support
    }
  }
})
```

**Example 4: Theme Customization**

```typescript
// apps/saas/app.config.ts
export default defineAppConfig({
  saas: {
    theme: {
      colors: {
        primary: 'purple',   // Change primary color to purple
        neutral: 'zinc'      // Change neutral color to zinc
      }
    }
  },
  ui: {
    // Nuxt UI configuration (inherited by saas layer)
    colors: {
      primary: 'purple',
      neutral: 'zinc'
    }
  }
})
```

### 4.3 Override Patterns

Apps can override any component, page, or layout from the saas meta-layer using Nuxt's layer resolution system.

**Override Priority** (highest to lowest):
```
App Files > Saas Layer > Feature Layers > Foundation Layers
```

**Example 1: Override Dashboard Home Page**

```vue
<!-- apps/saas/pages/index.vue -->
<template>
  <div>
    <h1>Custom Dashboard Home</h1>
    <!-- Completely custom implementation -->
  </div>
</template>

<script setup lang="ts">
// This overrides layers/saas/pages/index.vue
definePageMeta({
  layout: 'dashboard'
})
</script>
```

**Example 2: Override AppHeader Component**

```vue
<!-- apps/saas/components/AppHeader.vue -->
<template>
  <header class="custom-header">
    <!-- Custom header implementation -->
  </header>
</template>

<script setup lang="ts">
// This overrides layers/saas/components/AppHeader.vue
</script>
```

**Example 3: Extend Sidebar with Additional Items**

```typescript
// apps/saas/app.config.ts
export default defineAppConfig({
  saas: {
    navigation: {
      sidebar: [
        // Reuse layer defaults
        ...useSaasDefaults().navigation.sidebar,

        // Add custom section
        [
          { label: 'Analytics', icon: 'i-lucide-bar-chart', to: '/analytics' },
          { label: 'Reports', icon: 'i-lucide-file-text', to: '/reports' }
        ]
      ]
    }
  }
})
```

**Example 4: Customize Layout Behavior**

```typescript
// apps/saas/app.config.ts
export default defineAppConfig({
  saas: {
    layouts: {
      dashboard: {
        sidebarCollapsible: true,
        sidebarDefaultCollapsed: true  // Start collapsed
      }
    }
  }
})
```

---

## 5. Testing

### 5.1 E2E Tests

The saas meta-layer includes comprehensive E2E tests that verify the complete SaaS experience.

**Test Coverage**:
- ✅ Authentication flow (login, register, password reset)
- ✅ Dashboard navigation (sidebar, header, user menu)
- ✅ Workspace management (switch workspace, invite members)
- ✅ Billing flow (view subscription, change plan, view invoices)
- ✅ Settings pages (profile, account, security)
- ✅ Responsive behavior (mobile, tablet, desktop)
- ✅ Dark mode toggle
- ✅ Onboarding flow

**Test Structure**:
```
tests/e2e/specs/layers/saas/
├── navigation.spec.js           # Sidebar, header, user menu navigation
├── auth-pages.spec.js           # Authentication page flows
├── dashboard-pages.spec.js      # Dashboard page rendering
├── workspace-switching.spec.js  # Workspace switcher functionality
├── responsive.spec.js           # Mobile/tablet/desktop layouts
└── dark-mode.spec.js            # Dark mode toggle
```

**Example Test** (`tests/e2e/specs/layers/saas/navigation.spec.js`):

```javascript
import { test, expect } from '@playwright/test'
import { AuthHelper } from '../../helpers/auth'

test.describe('SaaS Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await AuthHelper.signIn(page, 'test@example.com', 'password')
  })

  test('sidebar navigation works', async ({ page }) => {
    // Verify sidebar visible
    await expect(page.locator('aside')).toBeVisible()

    // Navigate to billing
    await page.click('text=Billing')
    await expect(page).toHaveURL('/billing')

    // Navigate to workspace
    await page.click('text=Workspace')
    await expect(page).toHaveURL('/workspace')

    // Navigate back to dashboard
    await page.click('text=Dashboard')
    await expect(page).toHaveURL('/')
  })

  test('user menu works', async ({ page }) => {
    // Open user menu
    await page.click('[data-testid="user-menu"]')

    // Verify menu items
    await expect(page.locator('text=Profile')).toBeVisible()
    await expect(page.locator('text=Account Settings')).toBeVisible()
    await expect(page.locator('text=Sign Out')).toBeVisible()

    // Navigate to profile
    await page.click('text=Profile')
    await expect(page).toHaveURL('/settings/profile')
  })

  test('workspace switcher works', async ({ page }) => {
    // Open workspace switcher
    await page.click('[data-testid="workspace-switcher"]')

    // Verify workspaces listed
    await expect(page.locator('text=Personal')).toBeVisible()

    // Create new workspace option visible
    await expect(page.locator('text=Create Workspace')).toBeVisible()
  })
})
```

### 5.2 Visual Regression

Visual regression testing ensures UI consistency across updates.

**Tool**: Playwright Visual Comparisons

**Coverage**:
- Dashboard home page (light + dark mode)
- Auth pages (login, register, forgot password)
- Sidebar navigation (expanded + collapsed)
- User menu dropdown
- Workspace switcher dropdown
- Responsive layouts (mobile, tablet, desktop)

**Example Visual Test**:

```javascript
import { test, expect } from '@playwright/test'

test('dashboard home page visual', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('dashboard-home-light.png')

  // Switch to dark mode
  await page.click('[data-testid="dark-mode-toggle"]')
  await expect(page).toHaveScreenshot('dashboard-home-dark.png')
})
```

---

## 6. Implementation

### 6.1 Layer Structure

```
layers/saas/
├── components/
│   ├── AppShell.vue
│   ├── AppHeader.vue
│   ├── AppSidebar.vue
│   ├── UserMenu.vue
│   └── WorkspaceSwitcherDropdown.vue
├── layouts/
│   ├── dashboard.vue
│   ├── auth.vue
│   └── onboarding.vue
├── pages/
│   ├── index.vue
│   ├── auth/
│   │   ├── login.vue
│   │   ├── register.vue
│   │   ├── forgot-password.vue
│   │   └── reset-password.vue
│   ├── billing/
│   │   ├── index.vue
│   │   ├── plans.vue
│   │   └── invoices.vue
│   ├── workspace/
│   │   ├── index.vue
│   │   ├── members.vue
│   │   └── invitations.vue
│   ├── settings/
│   │   ├── profile.vue
│   │   ├── account.vue
│   │   └── security.vue
│   └── onboarding.vue
├── composables/
│   └── useSaasConfig.ts
├── types/
│   └── saas.ts
├── app.config.ts          # Default configuration
├── nuxt.config.ts         # Layer composition
├── package.json
└── README.md
```

### 6.2 Definition of Done

**Acceptance Criteria**:

- [ ] **Layer Composition**
  - [ ] Extends all necessary layers (amplify, auth, billing, workspaces, entitlements, uix, i18n)
  - [ ] Layer dependencies properly configured in nuxt.config.ts
  - [ ] No circular dependencies

- [ ] **Components**
  - [ ] AppShell component implemented
  - [ ] AppHeader component implemented
  - [ ] AppSidebar component implemented
  - [ ] UserMenu component implemented
  - [ ] WorkspaceSwitcherDropdown component implemented
  - [ ] All components use Nuxt UI (v4) components

- [ ] **Layouts**
  - [ ] Dashboard layout implemented
  - [ ] Auth layout implemented
  - [ ] Onboarding layout implemented
  - [ ] Responsive behavior works on mobile/tablet/desktop

- [ ] **Pages**
  - [ ] Dashboard home page implemented
  - [ ] All auth pages implemented (login, register, forgot password, reset password)
  - [ ] All billing pages implemented (subscription, plans, invoices)
  - [ ] All workspace pages implemented (settings, members, invitations)
  - [ ] All settings pages implemented (profile, account, security)
  - [ ] Onboarding page implemented

- [ ] **Configuration**
  - [ ] app.config.ts with complete schema implemented
  - [ ] Default configuration provided
  - [ ] Configuration is type-safe (TypeScript interfaces)
  - [ ] Documentation for all configuration options

- [ ] **Testing**
  - [ ] E2E tests for navigation implemented
  - [ ] E2E tests for auth pages implemented
  - [ ] E2E tests for dashboard pages implemented
  - [ ] E2E tests for workspace switching implemented
  - [ ] E2E tests for responsive behavior implemented
  - [ ] Visual regression tests implemented
  - [ ] All tests passing

- [ ] **Documentation**
  - [ ] README.md with usage examples
  - [ ] Configuration examples documented
  - [ ] Override patterns documented
  - [ ] Component API documented

- [ ] **Quality**
  - [ ] No TypeScript errors
  - [ ] No ESLint warnings
  - [ ] Lighthouse score > 90 (mobile)
  - [ ] WCAG 2.1 AA compliance

### 6.3 Implementation Plan

See [SaaS Meta-Layer Implementation Plan](../plan/saas-layer.md).

---

## 7. Non-Functional Requirements

### Performance
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Total Blocking Time**: < 200ms
- **Cumulative Layout Shift**: < 0.1
- **Lighthouse Score** (mobile): > 90

### Accessibility
- **WCAG 2.1 AA Compliance**: All pages and components
- **Keyboard Navigation**: Full support without mouse
- **Screen Reader Support**: Proper ARIA labels and landmarks
- **Focus Management**: Visible focus indicators
- **Color Contrast**: Minimum 4.5:1 for text

### Responsiveness
- **Mobile** (<768px): Single column, hamburger menu, touch-optimized
- **Tablet** (768px-1023px): Two columns, collapsible sidebar
- **Desktop** (≥1024px): Three columns, persistent sidebar

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile (last 2 versions)
- **No IE11 Support**: Focus on modern web standards

### SEO
- **Meta Tags**: Proper title, description, OpenGraph for all pages
- **Semantic HTML**: Proper heading hierarchy, landmarks
- **Sitemap**: Automatically generated
- **robots.txt**: Configured for search engines

---

**Related Documents**:
- [ARD: SaaS Meta-Layer Architecture](../adr/saas-layer.md)
- [Plan: SaaS Meta-Layer Implementation](../plan/saas-layer.md)
- [PRD: Auth Layer](./auth.md)
- [PRD: Billing Layer](./billing.md)
- [PRD: Workspaces Layer](./workspaces.md)
