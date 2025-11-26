# PRD: UIX Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
  - [2.1 Theme Switching Flow](#21-theme-switching-flow)
  - [2.2 Responsive Layout Flow](#22-responsive-layout-flow)
  - [2.3 Accessibility Navigation Flow](#23-accessibility-navigation-flow)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Configuration](#31-configuration)
  - [3.2 Theme System](#32-theme-system)
  - [3.3 Components](#33-components)
  - [3.4 Composables](#34-composables)
  - [3.5 Utilities](#35-utilities)
- [4. Testing](#4-testing)
  - [4.1 Unit Tests (Minimal)](#41-unit-tests-minimal)
  - [4.2 E2E Tests (Primary)](#42-e2e-tests-primary)
- [5. Implementation](#5-implementation)
  - [5.1 Layer Structure](#51-layer-structure)
  - [5.2 Definition of Done](#52-definition-of-done)
  - [5.3 Plan](#53-plan)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1 Accessibility](#61-accessibility)
  - [6.2 Performance](#62-performance)
  - [6.3 Design Consistency](#63-design-consistency)

## 1. Overview

### 1.1 Purpose

The UIX (User Interface/Experience) Layer provides a comprehensive design system and UI component library for Nuxt 4-based SaaS applications. Built on Nuxt UI Pro and Tailwind CSS, it delivers a consistent, accessible, and beautiful user interface foundation that all other layers and applications can leverage. This layer establishes design tokens, theming capabilities, responsive layouts, and pre-built components following modern UI/UX best practices.

### 1.2 Scope

**Includes**:
- Nuxt UI Pro integration and configuration
- Tailwind CSS setup with custom design tokens
- Theme system with light/dark mode support
- Design tokens (colors, typography, spacing, shadows)
- Layout components (header, sidebar, footer, container)
- Common UI patterns (forms, tables, modals, notifications)
- Icon system with Iconify integration
- Responsive design utilities and breakpoints
- Accessibility features (ARIA, keyboard navigation, screen reader support)
- Typography system with font loading
- Animation and transition utilities
- Component composition patterns

**Excludes**:
- Business logic components (handled by feature layers)
- Authentication UI (handled by Auth Layer)
- Billing UI (handled by Billing Layer)
- Workspace-specific UI (handled by Workspaces Layer)
- Application-specific pages (handled by apps)
- Backend integration logic (handled by Amplify/server API layers)

### 1.3 Key Requirements

**Technical**:
- Nuxt UI Pro v3.x integration
- Tailwind CSS v4.x with custom configuration
- SSR-compatible theming with no flash of unstyled content (FOUC)
- Type-safe component props with TypeScript
- Dark mode support with system preference detection
- Responsive design with mobile-first approach
- Icon system with tree-shaking for optimal bundle size
- CSS variables for dynamic theming

**Design**:
- Consistent visual language across all UI elements
- Modern, clean, professional aesthetic
- Accessible color contrast ratios (WCAG 2.1 AA minimum)
- Smooth animations and transitions
- Intuitive interaction patterns
- Mobile-responsive layouts
- Print-friendly styles

**Developer Experience**:
- Auto-imported components (no explicit imports needed)
- Comprehensive component documentation
- Type-safe prop definitions
- Composition-friendly component API
- Easy theme customization via config
- Hot-reload during development

### 1.4 Artifacts

**Configuration**:
- `nuxt.config.ts` - Nuxt UI Pro module configuration
- `tailwind.config.ts` - Tailwind customization with design tokens
- `app.config.ts` - Theme configuration and customization

**Components**:
- `<AppLayout>` - Main application layout with header/sidebar/footer
- `<AppHeader>` - Application header with navigation
- `<AppSidebar>` - Collapsible navigation sidebar
- `<AppFooter>` - Application footer
- `<PageHeader>` - Page title and actions container
- `<EmptyState>` - Empty state placeholder
- `<LoadingState>` - Loading skeleton and spinners
- `<ErrorState>` - Error display component

**Composables**:
- `useTheme()` - Theme management (light/dark mode)
- `useBreakpoints()` - Responsive breakpoint detection
- `useColorMode()` - Color mode utilities (from Nuxt UI)

**Utilities**:
- Design token exports (colors, spacing, typography)
- Tailwind utility class helpers
- Animation timing functions
- Responsive helpers

**Assets**:
- Logo files (SVG, PNG)
- Favicon set
- Font files (if self-hosting)


## 2. User Flows

### 2.1 Theme Switching Flow

**Actors**: User

**Preconditions**:
- Application loaded with default theme

**Flow**:
1. User navigates to application
2. **System detects preferred theme**:
   - Check stored preference in localStorage
   - If none, check system preference (prefers-color-scheme)
   - Default to light mode if no preference
3. Application renders with detected theme (no flash)
4. User clicks theme toggle button (usually in header)
5. System switches theme:
   - Updates color mode state
   - Applies new CSS variables
   - Persists preference to localStorage
   - Smooth transition animation (200ms)
6. All UI elements update to new theme
7. Theme preference persisted across sessions

**Success Criteria**:
- No flash of unstyled content (FOUC)
- Theme applies within 200ms
- Smooth visual transition
- Preference persists across page reloads
- System preference respected initially

### 2.2 Responsive Layout Flow

**Actors**: User

**Preconditions**:
- User accesses application on various devices

**Flow**:
1. **Desktop (≥1024px)**:
   - Full sidebar navigation visible
   - Header with full navigation items
   - Multi-column layouts
   - Hover states active
2. **Tablet (768px - 1023px)**:
   - Collapsible sidebar (hidden by default)
   - Hamburger menu icon shown
   - Two-column layouts adapt to single column
   - Touch-optimized interactions
3. **Mobile (< 768px)**:
   - Sidebar becomes full-screen overlay
   - Bottom navigation bar (optional)
   - Single-column layouts
   - Touch-optimized spacing and targets (min 44px)
   - Simplified navigation
4. User rotates device (orientation change)
5. Layout adapts immediately to new dimensions
6. All interactive elements remain accessible

**Success Criteria**:
- Smooth layout transitions
- No horizontal scrolling
- All features accessible on all devices
- Touch targets meet minimum size (44x44px)
- Layouts optimize for screen size

### 2.3 Accessibility Navigation Flow

**Actors**: User with assistive technology (screen reader, keyboard navigation)

**Preconditions**:
- User accesses application using keyboard or screen reader

**Flow**:
1. **Keyboard Navigation**:
   - User presses Tab key
   - Focus moves to first interactive element
   - Focus indicator clearly visible (outline)
   - User continues tabbing through all interactive elements in logical order
   - User presses Shift+Tab to move backward
   - Skip links available to jump to main content
2. **Screen Reader Navigation**:
   - Screen reader announces page title
   - Landmarks identified (header, nav, main, footer)
   - Heading hierarchy properly structured (h1 → h2 → h3)
   - ARIA labels provide context for icons and actions
   - Form fields have associated labels
   - Error messages announced dynamically
3. **Keyboard Shortcuts**:
   - Esc closes modals and dropdowns
   - Arrow keys navigate menus and lists
   - Space/Enter activates buttons and links
   - Ctrl/Cmd+K opens command palette (if implemented)

**Success Criteria**:
- All functionality accessible via keyboard
- Clear focus indicators (3px outline, high contrast)
- Logical tab order
- ARIA attributes properly implemented
- Screen reader announces all interactive elements
- Color contrast meets WCAG 2.1 AA (4.5:1 for text)


## 3. Technical Specifications

### 3.1 Configuration

#### 3.1.1 Nuxt Configuration

**Location**: `layers/uix/nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui'
  ],

  ui: {
    // Nuxt UI Pro configuration
    icons: ['heroicons', 'lucide'],
    safelistColors: ['primary', 'secondary', 'success', 'warning', 'error']
  },

  colorMode: {
    preference: 'system', // 'system' | 'light' | 'dark'
    fallback: 'light',
    classSuffix: '',
    storageKey: 'nuxt-color-mode'
  },

  css: [
    '~/assets/css/main.css'
  ],

  tailwindcss: {
    config: {
      // Tailwind config imported from tailwind.config.ts
    }
  }
})
```

#### 3.1.2 Tailwind Configuration

**Location**: `layers/uix/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

export default <Partial<Config>>{
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: colors.blue,
        secondary: colors.slate,

        // Semantic colors
        success: colors.green,
        warning: colors.amber,
        error: colors.red,
        info: colors.sky,

        // Grayscale
        gray: colors.slate
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },

      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 200ms ease-out',
        'slide-in': 'slideIn 300ms ease-out',
        'slide-out': 'slideOut 300ms ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
      },
    },
  },

  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
```

#### 3.1.3 App Configuration

**Location**: `layers/uix/app.config.ts`

```typescript
export default defineAppConfig({
  ui: {
    primary: 'blue',
    gray: 'slate',

    strategy: 'override', // or 'merge'

    // Global component defaults
    button: {
      rounded: 'lg',
      default: {
        size: 'md',
        color: 'primary',
        variant: 'solid'
      }
    },

    input: {
      rounded: 'lg',
      default: {
        size: 'md',
        color: 'primary',
        variant: 'outline'
      }
    },

    card: {
      rounded: 'xl',
      shadow: 'md'
    },

    modal: {
      overlay: {
        background: 'bg-gray-900/50 dark:bg-gray-900/80'
      }
    },

    notification: {
      position: 'top-right',
      timeout: 5000
    }
  }
})
```

### 3.2 Theme System

#### 3.2.1 CSS Variables

**Location**: `layers/uix/assets/css/main.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode colors */
    --color-background: 255 255 255;
    --color-foreground: 15 23 42;
    --color-muted: 241 245 249;
    --color-muted-foreground: 100 116 139;
    --color-border: 226 232 240;

    /* Brand colors */
    --color-primary: 59 130 246;
    --color-primary-foreground: 255 255 255;

    /* Semantic colors */
    --color-success: 34 197 94;
    --color-warning: 251 191 36;
    --color-error: 239 68 68;
    --color-info: 14 165 233;

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }

  .dark {
    /* Dark mode colors */
    --color-background: 15 23 42;
    --color-foreground: 248 250 252;
    --color-muted: 30 41 59;
    --color-muted-foreground: 148 163 184;
    --color-border: 51 65 85;

    /* Brand colors (slightly adjusted for dark mode) */
    --color-primary: 96 165 250;
    --color-primary-foreground: 15 23 42;

    /* Semantic colors */
    --color-success: 74 222 128;
    --color-warning: 252 211 77;
    --color-error: 248 113 113;
    --color-info: 56 189 248;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer components {
  /* Custom component styles */
  .btn {
    @apply inline-flex items-center justify-center rounded-lg font-medium transition-colors;
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2;
    @apply disabled:pointer-events-none disabled:opacity-50;
  }

  .input {
    @apply flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm;
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2;
    @apply disabled:cursor-not-allowed disabled:opacity-50;
  }
}

@layer utilities {
  /* Custom utility classes */
  .text-balance {
    text-wrap: balance;
  }

  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

#### 3.2.2 Typography

**Font Loading** (`layers/uix/app.vue`):

```vue
<template>
  <div>
    <slot />
  </div>
</template>

<script setup>
// Load fonts
useHead({
  link: [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com'
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: true
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    }
  ]
})
</script>
```

### 3.3 Components

#### 3.3.1 `<AppLayout>`

**Location**: `layers/uix/components/AppLayout.vue`

**Purpose**: Main application layout with header, sidebar, and content area.

```vue
<template>
  <div class="min-h-screen bg-background">
    <AppHeader v-if="showHeader" />

    <div class="flex">
      <AppSidebar v-if="showSidebar" />

      <main class="flex-1" :class="mainClasses">
        <slot />
      </main>
    </div>

    <AppFooter v-if="showFooter" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  showHeader?: boolean
  showSidebar?: boolean
  showFooter?: boolean
  container?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  showSidebar: true,
  showFooter: false,
  container: true
})

const mainClasses = computed(() => {
  return {
    'container mx-auto px-4 py-6': props.container,
    'p-0': !props.container
  }
})
</script>
```

#### 3.3.2 `<AppHeader>`

**Location**: `layers/uix/components/AppHeader.vue`

**Purpose**: Application header with navigation and user menu.

```vue
<template>
  <header class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="container flex h-16 items-center justify-between">
      <!-- Logo -->
      <div class="flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" class="h-8 w-auto" />
        </NuxtLink>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-6">
          <slot name="nav" />
        </nav>
      </div>

      <!-- Right Side -->
      <div class="flex items-center gap-3">
        <slot name="actions" />

        <!-- Theme Toggle -->
        <UButton
          icon="i-heroicons-moon"
          color="gray"
          variant="ghost"
          @click="toggleTheme"
        />

        <!-- Mobile Menu Toggle -->
        <UButton
          icon="i-heroicons-bars-3"
          color="gray"
          variant="ghost"
          class="md:hidden"
          @click="toggleMobileMenu"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const colorMode = useColorMode()

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const mobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}
</script>
```

#### 3.3.3 `<AppSidebar>`

**Location**: `layers/uix/components/AppSidebar.vue`

**Purpose**: Collapsible navigation sidebar.

```vue
<template>
  <aside
    class="hidden md:flex md:w-64 md:flex-col border-r border-border bg-muted/10"
    :class="{ 'md:w-16': collapsed }"
  >
    <div class="flex-1 overflow-y-auto p-4">
      <nav class="space-y-2">
        <slot />
      </nav>
    </div>

    <!-- Collapse Toggle -->
    <div class="border-t border-border p-4">
      <UButton
        :icon="collapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'"
        color="gray"
        variant="ghost"
        block
        @click="toggleCollapsed"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
const collapsed = ref(false)

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}
</script>
```

#### 3.3.4 `<PageHeader>`

**Location**: `layers/uix/components/PageHeader.vue`

**Purpose**: Page title and actions container.

```vue
<template>
  <div class="flex items-center justify-between pb-6 border-b border-border">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">
        {{ title }}
      </h1>
      <p v-if="description" class="text-muted-foreground mt-1">
        {{ description }}
      </p>
    </div>

    <div v-if="$slots.actions" class="flex items-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

defineProps<Props>()
</script>
```

#### 3.3.5 `<EmptyState>`

**Location**: `layers/uix/components/EmptyState.vue`

**Purpose**: Empty state placeholder with icon and call-to-action.

```vue
<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div class="rounded-full bg-muted p-4 mb-4">
      <UIcon :name="icon" class="h-8 w-8 text-muted-foreground" />
    </div>

    <h3 class="text-lg font-semibold mb-2">
      {{ title }}
    </h3>

    <p class="text-muted-foreground mb-6 max-w-md">
      {{ description }}
    </p>

    <div v-if="$slots.action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  title: string
  description: string
}

defineProps<Props>()
</script>
```

#### 3.3.6 `<LoadingState>`

**Location**: `layers/uix/components/LoadingState.vue`

**Purpose**: Loading skeleton and spinners.

```vue
<template>
  <div v-if="type === 'spinner'" class="flex items-center justify-center py-12">
    <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="type === 'skeleton'" class="space-y-4">
    <div v-for="i in rows" :key="i" class="animate-pulse">
      <div class="h-4 bg-muted rounded w-full"></div>
    </div>
  </div>

  <div v-else class="space-y-4">
    <!-- Card skeleton -->
    <UCard>
      <div class="animate-pulse space-y-3">
        <div class="h-4 bg-muted rounded w-3/4"></div>
        <div class="h-4 bg-muted rounded w-full"></div>
        <div class="h-4 bg-muted rounded w-5/6"></div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'spinner' | 'skeleton' | 'card'
  rows?: number
}

withDefaults(defineProps<Props>(), {
  type: 'spinner',
  rows: 3
})
</script>
```

#### 3.3.7 `<ErrorState>`

**Location**: `layers/uix/components/ErrorState.vue`

**Purpose**: Error display component.

```vue
<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div class="rounded-full bg-error/10 p-4 mb-4">
      <UIcon name="i-heroicons-exclamation-triangle" class="h-8 w-8 text-error" />
    </div>

    <h3 class="text-lg font-semibold mb-2 text-error">
      {{ title }}
    </h3>

    <p class="text-muted-foreground mb-6 max-w-md">
      {{ message }}
    </p>

    <UButton
      v-if="retry"
      @click="$emit('retry')"
    >
      Try Again
    </UButton>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  message: string
  retry?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'Something went wrong',
  retry: true
})

defineEmits<{
  retry: []
}>()
</script>
```

### 3.4 Composables

#### 3.4.1 `useTheme()`

**Location**: `layers/uix/composables/useTheme.ts`

**Purpose**: Theme management utilities (wrapper around useColorMode).

```typescript
export function useTheme() {
  const colorMode = useColorMode()

  const isDark = computed(() => colorMode.value === 'dark')
  const isLight = computed(() => colorMode.value === 'light')

  const theme = computed({
    get: () => colorMode.preference,
    set: (value: 'light' | 'dark' | 'system') => {
      colorMode.preference = value
    }
  })

  const toggleTheme = () => {
    colorMode.preference = isDark.value ? 'light' : 'dark'
  }

  const setTheme = (value: 'light' | 'dark' | 'system') => {
    colorMode.preference = value
  }

  return {
    theme,
    isDark,
    isLight,
    toggleTheme,
    setTheme
  }
}
```

#### 3.4.2 `useBreakpoints()`

**Location**: `layers/uix/composables/useBreakpoints.ts`

**Purpose**: Responsive breakpoint detection.

```typescript
import { useMediaQuery } from '@vueuse/core'

export function useBreakpoints() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isLargeDesktop = useMediaQuery('(min-width: 1280px)')
  const isExtraLarge = useMediaQuery('(min-width: 1536px)')

  const breakpoint = computed(() => {
    if (isMobile.value) return 'mobile'
    if (isTablet.value) return 'tablet'
    if (isLargeDesktop.value) return 'lg'
    if (isExtraLarge.value) return 'xl'
    return 'desktop'
  })

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isExtraLarge,
    breakpoint
  }
}
```

### 3.5 Utilities

#### 3.5.1 Design Tokens Export

**Location**: `layers/uix/utils/tokens.ts`

```typescript
/**
 * Design tokens for programmatic use
 */
export const tokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      900: '#1e3a8a'
    },
    success: {
      500: '#22c55e',
      600: '#16a34a'
    },
    warning: {
      500: '#f59e0b',
      600: '#d97706'
    },
    error: {
      500: '#ef4444',
      600: '#dc2626'
    }
  },

  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
  },

  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  }
} as const

export type Token = typeof tokens
```

#### 3.5.2 Class Name Utilities

**Location**: `layers/uix/utils/cn.ts`

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```


## 4. Testing

### 4.1 Unit Tests (Minimal)

**Scope**: Core utility functions and design token validation.

**Test Cases**:
- Theme utilities work correctly
- Class name merging works as expected
- Design tokens match Tailwind configuration
- Breakpoint detection logic

**Tools**: Vitest

**Example Test**:
```typescript
// layers/uix/tests/unit/tokens.test.ts
import { describe, it, expect } from 'vitest'
import { tokens } from '../../utils/tokens'

describe('Design Tokens', () => {
  it('should export color tokens', () => {
    expect(tokens.colors.primary[500]).toBe('#3b82f6')
  })

  it('should export spacing tokens', () => {
    expect(tokens.spacing.md).toBe('1rem')
  })

  it('should export breakpoint values', () => {
    expect(tokens.breakpoints.md).toBe(768)
  })
})
```

### 4.2 E2E Tests (Primary)

**Scope**: Visual regression and accessibility testing.

**Test Cases**:

1. **Theme Switching**:
   - Theme toggle works correctly
   - Theme persists across reloads
   - No flash of unstyled content
   - All components render correctly in both themes

2. **Responsive Layout**:
   - Layout adapts at breakpoints
   - Sidebar collapses on mobile
   - Touch targets meet minimum size
   - No horizontal scrolling

3. **Accessibility**:
   - Keyboard navigation works
   - Focus indicators visible
   - ARIA attributes present
   - Color contrast meets WCAG AA
   - Screen reader compatibility

**Tools**: Playwright with visual regression

**Example Test**:
```typescript
// apps/saas/tests/e2e/uix/theme-switching.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Theme Switching', () => {
  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/')

    // Verify light mode initially
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // Click theme toggle
    await page.click('[data-testid="theme-toggle"]')

    // Verify dark mode applied
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Verify persists after reload
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('should respect system preference', async ({ page }) => {
    // Set system to dark mode
    await page.emulateMedia({ colorScheme: 'dark' })

    await page.goto('/')

    // Should default to dark mode
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
```


## 5. Implementation

### 5.1 Layer Structure

```
layers/uix/
├── assets/
│   ├── css/
│   │   └── main.css                # Global styles and CSS variables
│   ├── fonts/                      # Self-hosted fonts (optional)
│   └── images/
│       ├── logo.svg
│       └── logo-dark.svg
├── components/
│   ├── AppLayout.vue
│   ├── AppHeader.vue
│   ├── AppSidebar.vue
│   ├── AppFooter.vue
│   ├── PageHeader.vue
│   ├── EmptyState.vue
│   ├── LoadingState.vue
│   └── ErrorState.vue
├── composables/
│   ├── useTheme.ts
│   └── useBreakpoints.ts
├── utils/
│   ├── tokens.ts                   # Design token exports
│   └── cn.ts                       # Class name utilities
├── tests/
│   ├── unit/
│   │   └── tokens.test.ts
│   └── e2e/
│       ├── theme-switching.spec.ts
│       ├── responsive-layout.spec.ts
│       └── accessibility.spec.ts
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── app.config.ts                   # Nuxt UI configuration
├── tailwind.config.ts              # Tailwind customization
├── nuxt.config.ts                  # Layer configuration
├── package.json
└── README.md
```

### 5.2 Definition of Done

**Code Complete**:
- [ ] Nuxt UI Pro configured and working
- [ ] Tailwind CSS configured with custom design tokens
- [ ] Theme system implemented (light/dark mode)
- [ ] All layout components implemented
- [ ] All state components implemented (empty, loading, error)
- [ ] Composables implemented with SSR compatibility

**Design Complete**:
- [ ] Design tokens defined and documented
- [ ] Color palette established (primary, semantic, grayscale)
- [ ] Typography system configured
- [ ] Spacing scale defined
- [ ] Shadow scale defined
- [ ] Border radius scale defined

**Accessibility**:
- [ ] WCAG 2.1 AA color contrast ratios met
- [ ] Keyboard navigation functional
- [ ] Focus indicators visible (3px outline)
- [ ] ARIA attributes properly implemented
- [ ] Screen reader tested

**Testing**:
- [ ] Unit tests for design tokens
- [ ] E2E tests for theme switching
- [ ] E2E tests for responsive layouts
- [ ] Accessibility tests (axe-core)
- [ ] Visual regression tests

**Documentation**:
- [ ] README with setup instructions
- [ ] Component usage examples
- [ ] Design token documentation
- [ ] Theme customization guide
- [ ] Accessibility guidelines

**Quality**:
- [ ] ESLint passing
- [ ] TypeScript compilation with no errors
- [ ] All tests passing
- [ ] No console errors
- [ ] No flash of unstyled content (FOUC)

### 5.3 Plan

See [UIX Implementation Plan](../plan/uix.md).


## 6. Non-Functional Requirements

### 6.1 Accessibility

**WCAG 2.1 AA Compliance**:
- Color contrast ratios ≥ 4.5:1 for normal text
- Color contrast ratios ≥ 3:1 for large text (18pt+)
- Color contrast ratios ≥ 3:1 for UI components
- All interactive elements keyboard accessible
- Focus indicators clearly visible (3px solid outline)

**Keyboard Navigation**:
- Tab order follows logical reading order
- All interactive elements reachable via Tab
- Esc closes modals, dropdowns, and overlays
- Arrow keys navigate menus and lists
- Enter/Space activates buttons and links

**Screen Reader Support**:
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for icon-only buttons
- ARIA live regions for dynamic content
- Landmark roles (header, nav, main, footer)
- Form labels properly associated with inputs

**Touch Accessibility**:
- Touch targets minimum 44x44px
- Adequate spacing between interactive elements
- Touch-friendly gestures (swipe, pinch, tap)
- No hover-only interactions

### 6.2 Performance

**Load Performance**:
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- No layout shifts (CLS = 0)

**Runtime Performance**:
- Theme switching: < 200ms
- Smooth 60fps animations
- No jank during interactions
- Efficient re-renders

**Bundle Size**:
- Critical CSS inlined (< 14KB)
- Tree-shaken icon system
- Font subsetting for reduced size
- CSS purged of unused styles

**Optimization**:
- CSS variables for dynamic theming (no runtime calculation)
- Nuxt UI Pro tree-shaking enabled
- Icon lazy loading
- Font display: swap for fast text rendering

### 6.3 Design Consistency

**Visual Language**:
- Consistent color usage across all components
- Unified typography scale
- Consistent spacing system
- Cohesive border radius scale
- Harmonious shadow system

**Component Patterns**:
- Consistent prop naming conventions
- Unified size variants (xs, sm, md, lg, xl)
- Consistent color variants (primary, success, warning, error)
- Standard slot names (default, action, icon)

**Responsive Design**:
- Mobile-first approach
- Consistent breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Fluid typography scaling
- Adaptive layouts for all screen sizes

**Documentation**:
- Component API documentation
- Usage examples for all components
- Design token reference
- Theme customization guide
- Accessibility guidelines
