# Implementation Plan: SaaS Meta-Layer

**Date**: 2025-12-02
**Status**: Draft
**Estimated Effort**: 2-3 days
**Priority**: High

---

## Overview

This plan details the implementation of the SaaS meta-layer (`@starter-nuxt-amplify-saas/saas`), which aggregates all feature and foundation layers and provides a complete, production-ready application shell with layouts, pages, navigation, and UI components.

**Goals**:
- ✅ Create aggregation layer extending all necessary layers
- ✅ Implement complete application shell with professional UX
- ✅ Provide configuration-driven customization via app.config.ts
- ✅ Enable apps to override any component, page, or layout
- ✅ Deliver production-ready SaaS dashboard in minutes

---

## Implementation Phases

### Phase 1: Layer Foundation (4 hours)

#### 1.1 Create Layer Structure

**Objective**: Set up the basic layer directory structure and configuration.

**Tasks**:
- [ ] Create `layers/saas/` directory
- [ ] Create `layers/saas/package.json` with proper workspace name
- [ ] Create `layers/saas/nuxt.config.ts` with layer composition
- [ ] Create `layers/saas/README.md` with usage documentation
- [ ] Create `layers/saas/tsconfig.json` for TypeScript support

**Files to Create**:

```json
// layers/saas/package.json
{
  "name": "@starter-nuxt-amplify-saas/saas",
  "version": "0.1.0",
  "type": "module",
  "description": "Complete SaaS application shell with layouts, pages, and navigation",
  "author": "Your Name",
  "license": "MIT",
  "exports": {
    ".": "./nuxt.config.ts"
  },
  "dependencies": {
    "@starter-nuxt-amplify-saas/amplify": "workspace:*",
    "@starter-nuxt-amplify-saas/auth": "workspace:*",
    "@starter-nuxt-amplify-saas/billing": "workspace:*",
    "@starter-nuxt-amplify-saas/workspaces": "workspace:*",
    "@starter-nuxt-amplify-saas/entitlements": "workspace:*",
    "@starter-nuxt-amplify-saas/uix": "workspace:*",
    "@starter-nuxt-amplify-saas/i18n": "workspace:*"
  }
}
```

```typescript
// layers/saas/nuxt.config.ts
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
})
```

**Verification**:
```bash
# Test layer resolution
pnpm install
pnpm --filter @starter-nuxt-amplify-saas/saas exec nuxt info
```

---

#### 1.2 Create Configuration System

**Objective**: Implement type-safe configuration schema and default values.

**Tasks**:
- [ ] Create `layers/saas/types/saas.ts` with configuration interfaces
- [ ] Create `layers/saas/app.config.ts` with default configuration
- [ ] Create `layers/saas/composables/useSaasConfig.ts` for configuration access
- [ ] Add JSDoc comments to all configuration options

**Files to Create**:

```typescript
// layers/saas/types/saas.ts
export interface SaasConfig {
  brand: {
    name: string
    logo: string
    description: string
    favicon: string
  }
  navigation: {
    sidebar: NavigationItem[][]
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

```typescript
// layers/saas/app.config.ts
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

```typescript
// layers/saas/composables/useSaasConfig.ts
import type { SaasConfig } from '../types/saas'

export function useSaasConfig(): SaasConfig {
  const appConfig = useAppConfig()
  return appConfig.saas as SaasConfig
}
```

**Verification**:
```vue
<!-- Test in any component -->
<script setup lang="ts">
const config = useSaasConfig()
console.log('Brand name:', config.brand.name)
console.log('Navigation:', config.navigation.sidebar)
</script>
```

---

### Phase 2: Core Components (6 hours)

#### 2.1 Create AppHeader Component

**Objective**: Implement top navigation bar with branding, workspace switcher, and user menu.

**Tasks**:
- [ ] Create `layers/saas/components/AppHeader.vue`
- [ ] Implement responsive behavior (mobile/tablet/desktop)
- [ ] Add workspace switcher integration
- [ ] Add user menu integration
- [ ] Add dark mode toggle

**File to Create**:

```vue
<!-- layers/saas/components/AppHeader.vue -->
<template>
  <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between px-4 h-16">
      <!-- Left: Logo & Workspace Switcher -->
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Toggle -->
        <UButton
          icon="i-lucide-menu"
          variant="ghost"
          class="md:hidden"
          @click="$emit('toggle-sidebar')"
        />

        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2">
          <img :src="config.brand.logo" :alt="config.brand.name" class="h-8" />
          <span class="font-semibold text-lg hidden md:inline">{{ config.brand.name }}</span>
        </NuxtLink>

        <!-- Workspace Switcher -->
        <WorkspaceSwitcherDropdown v-if="config.features.workspaceSwitcher" />
      </div>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2">
        <!-- Dark Mode Toggle -->
        <UButton
          v-if="config.features.darkMode"
          :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
          variant="ghost"
          @click="toggleDarkMode"
        />

        <!-- User Menu -->
        <UserMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const config = useSaasConfig()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggleDarkMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

defineEmits<{
  'toggle-sidebar': []
}>()
</script>
```

---

#### 2.2 Create AppSidebar Component

**Objective**: Implement side navigation menu with configurable items.

**Tasks**:
- [ ] Create `layers/saas/components/AppSidebar.vue`
- [ ] Implement collapsible behavior
- [ ] Add active route highlighting
- [ ] Add responsive behavior (hide on mobile)
- [ ] Support grouped navigation items

**File to Create**:

```vue
<!-- layers/saas/components/AppSidebar.vue -->
<template>
  <aside
    v-show="!isMobile || isOpen"
    class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto"
    :class="{
      'fixed inset-0 top-16 z-40 md:relative md:z-auto': isMobile
    }"
  >
    <nav class="p-4">
      <!-- Navigation Groups -->
      <div
        v-for="(group, groupIndex) in config.navigation.sidebar"
        :key="groupIndex"
        class="mb-6 last:mb-0"
      >
        <ul class="space-y-2">
          <li v-for="item in group" :key="item.to || item.label">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              active-class="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-medium"
            >
              <UIcon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
              <span>{{ item.label }}</span>
              <UBadge v-if="item.badge" variant="subtle" class="ml-auto">
                {{ item.badge }}
              </UBadge>
            </NuxtLink>

            <button
              v-else-if="item.click"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="item.click"
            >
              <UIcon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
              <span>{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Mobile Overlay -->
    <div
      v-if="isMobile && isOpen"
      class="fixed inset-0 bg-black/50 z-30 md:hidden"
      @click="$emit('close')"
    />
  </aside>
</template>

<script setup lang="ts">
const config = useSaasConfig()

const props = defineProps<{
  isOpen?: boolean
}>()

const emit = defineEmits<{
  'close': []
}>()

// Responsive behavior
const isMobile = ref(false)
onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
  onUnmounted(() => window.removeEventListener('resize', checkMobile))
})

// Close sidebar when route changes on mobile
const route = useRoute()
watch(() => route.path, () => {
  if (isMobile.value) {
    emit('close')
  }
})
</script>
```

---

#### 2.3 Create UserMenu Component

**Objective**: Implement user dropdown menu with profile, settings, and sign out actions.

**Tasks**:
- [ ] Create `layers/saas/components/UserMenu.vue`
- [ ] Integrate with auth layer (useUser composable)
- [ ] Add avatar display
- [ ] Implement configurable menu items
- [ ] Add sign out functionality

**File to Create**:

```vue
<!-- layers/saas/components/UserMenu.vue -->
<template>
  <UDropdown :items="menuItems">
    <UButton
      variant="ghost"
      class="flex items-center gap-2"
      data-testid="user-menu"
    >
      <!-- Avatar -->
      <UAvatar
        :src="user?.attributes?.picture"
        :alt="userName"
        size="sm"
      />

      <!-- User Name (hidden on mobile) -->
      <span class="hidden md:inline">{{ userName }}</span>

      <!-- Dropdown Icon -->
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
    </UButton>
  </UDropdown>
</template>

<script setup lang="ts">
const config = useSaasConfig()
const { user, signOut } = useUser()
const router = useRouter()

// User display name
const userName = computed(() =>
  user.value?.attributes?.name ||
  user.value?.username ||
  'User'
)

// Build menu items from configuration + sign out action
const menuItems = computed(() => {
  const configItems = config.userMenu.map(group =>
    group.map(item => ({
      label: item.label,
      icon: item.icon,
      to: item.to,
      click: item.click
    }))
  )

  // Add sign out action as last group
  return [
    ...configItems,
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
})
</script>
```

---

#### 2.4 Create WorkspaceSwitcherDropdown Component

**Objective**: Implement workspace switcher for multi-tenant apps.

**Tasks**:
- [ ] Create `layers/saas/components/WorkspaceSwitcherDropdown.vue`
- [ ] Integrate with workspaces layer (useWorkspaces composable)
- [ ] Display current workspace
- [ ] List all user workspaces
- [ ] Add "Create Workspace" option
- [ ] Handle workspace switching

**File to Create**:

```vue
<!-- layers/saas/components/WorkspaceSwitcherDropdown.vue -->
<template>
  <UDropdown
    v-if="config.features.multiWorkspace"
    :items="workspaceItems"
    data-testid="workspace-switcher"
  >
    <UButton variant="outline" class="flex items-center gap-2">
      <!-- Workspace Icon -->
      <UIcon
        :name="currentWorkspace?.isPersonal ? 'i-lucide-user' : 'i-lucide-building'"
        class="w-4 h-4"
      />

      <!-- Workspace Name -->
      <span class="max-w-[150px] truncate">
        {{ currentWorkspace?.name || 'Select Workspace' }}
      </span>

      <!-- Dropdown Icon -->
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
    </UButton>
  </UDropdown>
</template>

<script setup lang="ts">
const config = useSaasConfig()
const { workspaces, currentWorkspace, switchWorkspace } = useWorkspaces()

// Build dropdown items from workspaces
const workspaceItems = computed(() => {
  const items = []

  // Workspace list
  if (workspaces.value && workspaces.value.length > 0) {
    items.push(
      workspaces.value.map(ws => ({
        label: ws.name,
        icon: ws.isPersonal ? 'i-lucide-user' : 'i-lucide-users',
        click: () => switchWorkspace(ws.id)
      }))
    )
  }

  // Create workspace action
  items.push([
    {
      label: 'Create Workspace',
      icon: 'i-lucide-plus',
      to: '/workspace/create'
    }
  ])

  return items
})
</script>
```

---

### Phase 3: Layouts (4 hours)

#### 3.1 Create Dashboard Layout

**Objective**: Implement authenticated dashboard layout with header and sidebar.

**Tasks**:
- [ ] Create `layers/saas/layouts/dashboard.vue`
- [ ] Integrate AppHeader and AppSidebar components
- [ ] Add authentication middleware
- [ ] Handle sidebar toggle state
- [ ] Add workspace context loading

**File to Create**:

```vue
<!-- layers/saas/layouts/dashboard.vue -->
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <AppHeader @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <div class="flex">
      <!-- Sidebar -->
      <AppSidebar
        :is-open="isSidebarOpen"
        @close="isSidebarOpen = false"
      />

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

// Sidebar state
const isSidebarOpen = ref(false)

// Load workspace context
const { currentWorkspace } = useWorkspace()
const { user } = useUser()

// Ensure user has workspace
onMounted(() => {
  if (!currentWorkspace.value) {
    console.warn('No workspace selected')
  }
})
</script>
```

---

#### 3.2 Create Auth Layout

**Objective**: Implement public authentication pages layout.

**Tasks**:
- [ ] Create `layers/saas/layouts/auth.vue`
- [ ] Add centered content with branding
- [ ] Add guest middleware (redirect if authenticated)
- [ ] Add footer with links
- [ ] Support configuration options

**File to Create**:

```vue
<!-- layers/saas/layouts/auth.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <div class="w-full max-w-md">
      <!-- Branding -->
      <div v-if="config.layouts.auth.showBranding" class="text-center mb-8">
        <img
          :src="config.brand.logo"
          :alt="config.brand.name"
          class="h-12 mx-auto mb-4"
        />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ config.brand.name }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ config.brand.description }}
        </p>
      </div>

      <!-- Content Card -->
      <UCard>
        <slot />
      </UCard>

      <!-- Footer -->
      <div v-if="config.layouts.auth.showFooter" class="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
        <NuxtLink to="/privacy" class="hover:text-gray-900 dark:hover:text-white">
          Privacy
        </NuxtLink>
        <span class="mx-2">·</span>
        <NuxtLink to="/terms" class="hover:text-gray-900 dark:hover:text-white">
          Terms
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useSaasConfig()

// Redirect if already authenticated
definePageMeta({
  middleware: ['guest']
})
</script>
```

---

#### 3.3 Create Onboarding Layout

**Objective**: Implement first-time user setup layout with progress tracking.

**Tasks**:
- [ ] Create `layers/saas/layouts/onboarding.vue`
- [ ] Add step indicator
- [ ] Add progress bar
- [ ] Add skip option
- [ ] Add navigation between steps

**File to Create**:

```vue
<!-- layers/saas/layouts/onboarding.vue -->
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="text-center mb-8">
        <img
          :src="config.brand.logo"
          :alt="config.brand.name"
          class="h-12 mx-auto mb-4"
        />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome to {{ config.brand.name }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Let's get you set up
        </p>
      </div>

      <!-- Progress Bar -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Step {{ currentStep }} of {{ totalSteps }}
          </span>
          <NuxtLink
            to="/"
            class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Skip for now
          </NuxtLink>
        </div>
        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-600 transition-all duration-300"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          />
        </div>
      </div>

      <!-- Content -->
      <UCard>
        <slot />
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useSaasConfig()
const route = useRoute()

// Step tracking
const currentStep = computed(() => Number(route.query.step) || 1)
const totalSteps = computed(() => Number(route.query.total) || 3)

// Ensure authenticated
definePageMeta({
  middleware: ['auth']
})
</script>
```

---

### Phase 4: Pages Implementation (8 hours)

#### 4.1 Dashboard Home Page

```vue
<!-- layers/saas/pages/index.vue -->
<template>
  <div>
    <!-- Page Header -->
    <UPageHeader
      :title="`Welcome, ${userName}`"
      :description="`${currentWorkspace?.name} workspace`"
    />

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      <!-- Subscription -->
      <UCard>
        <template #header>
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-zap" />
            Subscription
          </h3>
        </template>
        <p class="text-2xl font-bold">{{ subscription?.plan?.name || 'Free' }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Current plan</p>
        <template #footer>
          <UButton to="/billing/plans" variant="ghost" size="sm">
            Upgrade
          </UButton>
        </template>
      </UCard>

      <!-- Team Members -->
      <UCard>
        <template #header>
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-users" />
            Team Members
          </h3>
        </template>
        <p class="text-2xl font-bold">{{ workspaceMembers?.length || 0 }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Active members</p>
        <template #footer>
          <UButton to="/workspace/members" variant="ghost" size="sm">
            Manage
          </UButton>
        </template>
      </UCard>

      <!-- Workspace -->
      <UCard>
        <template #header>
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-building" />
            Workspace
          </h3>
        </template>
        <p class="text-2xl font-bold">{{ currentWorkspace?.name }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Current workspace</p>
        <template #footer>
          <UButton to="/workspace" variant="ghost" size="sm">
            Settings
          </UButton>
        </template>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <div class="mt-8">
      <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UButton to="/workspace/members" size="lg" block>
          <UIcon name="i-lucide-user-plus" class="mr-2" />
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

const userName = computed(() =>
  user.value?.attributes?.name ||
  user.value?.username ||
  'there'
)
</script>
```

#### 4.2 Auth Pages

Create all authentication pages:
- [ ] `layers/saas/pages/auth/login.vue`
- [ ] `layers/saas/pages/auth/register.vue`
- [ ] `layers/saas/pages/auth/forgot-password.vue`
- [ ] `layers/saas/pages/auth/reset-password.vue`

**Example: Login Page**:

```vue
<!-- layers/saas/pages/auth/login.vue -->
<template>
  <div>
    <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Sign In</h2>

    <form @submit.prevent="handleLogin">
      <!-- Email -->
      <UFormGroup label="Email" class="mb-4">
        <UInput
          v-model="credentials.username"
          type="email"
          placeholder="you@example.com"
          required
          autocomplete="email"
        />
      </UFormGroup>

      <!-- Password -->
      <UFormGroup label="Password" class="mb-4">
        <UInput
          v-model="credentials.password"
          type="password"
          placeholder="••••••••"
          required
          autocomplete="current-password"
        />
      </UFormGroup>

      <!-- Remember Me & Forgot Password -->
      <div class="flex items-center justify-between mb-6">
        <UCheckbox v-model="rememberMe" label="Remember me" />
        <NuxtLink
          to="/auth/forgot-password"
          class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Forgot password?
        </NuxtLink>
      </div>

      <!-- Submit Button -->
      <UButton type="submit" :loading="isLoading" block size="lg">
        Sign In
      </UButton>
    </form>

    <!-- Sign Up Link -->
    <p class="text-center text-sm mt-6 text-gray-600 dark:text-gray-400">
      Don't have an account?
      <NuxtLink
        to="/auth/register"
        class="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
      >
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
const toast = useToast()

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
    toast.add({
      title: 'Welcome back!',
      description: 'You have successfully signed in.',
      color: 'green'
    })
    router.push('/')
  } catch (error: any) {
    toast.add({
      title: 'Sign in failed',
      description: error.message || 'Invalid credentials',
      color: 'red'
    })
  } finally {
    isLoading.value = false
  }
}
</script>
```

#### 4.3 Billing Pages

Create billing management pages:
- [ ] `layers/saas/pages/billing/index.vue` - Current subscription
- [ ] `layers/saas/pages/billing/plans.vue` - Available plans
- [ ] `layers/saas/pages/billing/invoices.vue` - Billing history

#### 4.4 Workspace Pages

Create workspace management pages:
- [ ] `layers/saas/pages/workspace/index.vue` - Workspace settings
- [ ] `layers/saas/pages/workspace/members.vue` - Team members
- [ ] `layers/saas/pages/workspace/invitations.vue` - Pending invitations

#### 4.5 Settings Pages

Create user settings pages:
- [ ] `layers/saas/pages/settings/profile.vue` - User profile
- [ ] `layers/saas/pages/settings/account.vue` - Account settings
- [ ] `layers/saas/pages/settings/security.vue` - Security settings

---

### Phase 5: Testing (4 hours)

#### 5.1 E2E Tests

Create comprehensive E2E tests:
- [ ] `tests/e2e/specs/layers/saas/navigation.spec.js`
- [ ] `tests/e2e/specs/layers/saas/auth-pages.spec.js`
- [ ] `tests/e2e/specs/layers/saas/dashboard-pages.spec.js`
- [ ] `tests/e2e/specs/layers/saas/workspace-switching.spec.js`
- [ ] `tests/e2e/specs/layers/saas/responsive.spec.js`

**Example Test**:

```javascript
// tests/e2e/specs/layers/saas/navigation.spec.js
import { test, expect } from '@playwright/test'
import { AuthHelper } from '../../helpers/auth'

test.describe('SaaS Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await AuthHelper.signIn(page, 'test@example.com', 'password')
    await page.goto('/')
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
    await expect(page.locator('text=Sign Out')).toBeVisible()

    // Navigate to profile
    await page.click('text=Profile')
    await expect(page).toHaveURL('/settings/profile')
  })

  test('responsive behavior', async ({ page, viewport }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Sidebar should be hidden
    await expect(page.locator('aside')).not.toBeVisible()

    // Toggle sidebar
    await page.click('[data-testid="toggle-sidebar"]')
    await expect(page.locator('aside')).toBeVisible()
  })
})
```

---

### Phase 6: Documentation (2 hours)

#### 6.1 Layer README

Create comprehensive README with:
- [ ] Installation instructions
- [ ] Configuration examples
- [ ] Override patterns
- [ ] Customization guide
- [ ] Component API documentation

**File to Create**:

```markdown
<!-- layers/saas/README.md -->
# SaaS Meta-Layer

Complete SaaS application shell with layouts, pages, and navigation.

## Installation

```bash
pnpm install
```

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
      name: 'Acme Corp',
      logo: '/acme-logo.svg'
    },
    navigation: {
      sidebar: [
        [
          { label: 'Dashboard', icon: 'i-lucide-home', to: '/' }
        ]
      ]
    }
  }
})
```

### Override Components

```vue
<!-- apps/saas/components/AppHeader.vue -->
<template>
  <header>
    <!-- Custom header implementation -->
  </header>
</template>
```

## Configuration

See [PRD](../../doc/prd/saas-layer.md) for full configuration schema.

## Components

- `AppHeader` - Top navigation bar
- `AppSidebar` - Side navigation menu
- `UserMenu` - User dropdown menu
- `WorkspaceSwitcherDropdown` - Workspace switcher

## Layouts

- `dashboard` - Authenticated dashboard layout
- `auth` - Public authentication layout
- `onboarding` - First-time user setup layout

## Pages

See [PRD](../../doc/prd/saas-layer.md) for complete page list.
```

---

## Verification Checklist

### Development Verification

- [ ] Layer extends all necessary dependencies
- [ ] Configuration is type-safe
- [ ] All components render without errors
- [ ] Navigation works correctly
- [ ] Responsive behavior works on mobile/tablet/desktop
- [ ] Dark mode toggle works
- [ ] Workspace switcher works (if enabled)
- [ ] Auth pages redirect correctly
- [ ] Dashboard pages require authentication

### Testing Verification

- [ ] All E2E tests passing
- [ ] Visual regression tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Lighthouse score > 90 (mobile)

### Documentation Verification

- [ ] README.md complete
- [ ] Configuration examples work
- [ ] Override patterns documented
- [ ] PRD and ADR updated

---

## Deployment Plan

### Phase 1: Soft Launch (Internal Testing)

1. **Create saas layer in layers/saas/**
2. **Update apps/saas/ to extend saas layer**
3. **Test in development environment**
4. **Gather feedback from internal users**

### Phase 2: Production Rollout

1. **Merge to main branch**
2. **Deploy to production**
3. **Monitor for issues**
4. **Document any required migrations**

### Phase 3: Documentation & Communication

1. **Update main project README**
2. **Create migration guide for existing apps**
3. **Share examples of customization patterns**

---

## Related Documents

- [PRD: SaaS Meta-Layer](../prd/saas-layer.md)
- [ARD: SaaS Meta-Layer Architecture](../adr/saas-layer.md)
- [Gap Analysis: Code vs PRD](../analysis/gap-analysis-code-vs-prd.md)
- [Gap Analysis: Code vs ARD](../analysis/gap-analysis-code-vs-adr.md)

---

## Success Criteria

- ✅ Apps can extend single saas layer instead of 7+ individual layers
- ✅ Complete dashboard UI works out-of-the-box
- ✅ Configuration via app.config.ts is intuitive and type-safe
- ✅ Apps can override any component/page/layout
- ✅ All E2E tests passing
- ✅ Documentation complete
- ✅ Production deployment successful
