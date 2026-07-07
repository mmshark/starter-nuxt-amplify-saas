# UIX Layer

UI foundation layer for Nuxt 3 applications. This layer provides the base design system, Nuxt UI Pro integration, Tailwind CSS configuration, and core styling foundation for all applications.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Design System](#design-system)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Customization](#customization)

## Overview

The UIX layer establishes the design foundation providing:

- 🎨 **Nuxt UI Pro** - Premium component library integration
- 🌈 **Design Tokens** - Consistent colors, typography, and spacing
- 🌙 **Dark Mode** - Built-in dark/light theme support
- ⚡ **Tailwind CSS** - Utility-first styling framework
- 📱 **Responsive Design** - Mobile-first responsive utilities
- 🎭 **Custom Theme** - Brand-specific color palette and fonts
- 🔧 **Extensible** - Easy customization and extension

## Architecture

```
layers/uix/
├── assets/css/           # Core stylesheets
│   └── main.css         # Main stylesheet with theme tokens
├── app.config.ts        # UI configuration and color scheme
├── nuxt.config.ts       # Module configuration
└── package.json         # Layer dependencies
```

## Design System

### Color Palette

The layer defines a cohesive color system:

#### Primary Colors
- **Primary**: Blue (customizable via app.config.ts)
- **Neutral**: Slate (for backgrounds, borders, text)

#### Custom Brand Colors
```css
/* Green palette (custom brand colors) */
--color-green-50: #EFFDF5    /* Lightest */
--color-green-400: #00DC82   /* Brand accent */
--color-green-500: #00C16A   /* Primary brand */
--color-green-950: #052E16   /* Darkest */
```

#### Usage in Code
```vue
<template>
  <!-- Using primary colors (blue by default) -->
  <UButton color="primary">Primary Action</UButton>
  
  <!-- Using neutral colors -->
  <UCard class="border-neutral-200">
    <p class="text-neutral-600">Content</p>
  </UCard>
  
  <!-- Using custom brand colors -->
  <div class="bg-green-50 text-green-800 border-green-200">
    Success message
  </div>
</template>
```

### Typography

#### Font Stack
- **Primary Font**: 'Public Sans' (clean, modern sans-serif)
- **Fallback**: Default system sans-serif fonts

#### Typography Scale
Uses Tailwind's typography utilities with consistent scaling:
```vue
<template>
  <!-- Headings -->
  <h1 class="text-3xl font-bold">Main Title</h1>
  <h2 class="text-2xl font-semibold">Section Title</h2>
  <h3 class="text-xl font-medium">Subsection</h3>
  
  <!-- Body text -->
  <p class="text-base">Regular paragraph text</p>
  <p class="text-sm text-neutral-600">Secondary text</p>
  
  <!-- Interactive text -->
  <a class="text-primary-500 hover:text-primary-600">Link text</a>
</template>
```

### Dark Mode

Built-in dark mode support with automatic color switching:

```css
/* Automatic dark mode background */
.dark {
  --ui-bg: var(--ui-color-neutral-950);
}
```

#### Dark Mode Usage
```vue
<template>
  <!-- Colors adapt automatically -->
  <div class="bg-white dark:bg-neutral-900">
    <p class="text-neutral-900 dark:text-neutral-100">
      This text adapts to theme
    </p>
  </div>
</template>

<script setup>
const colorMode = useColorMode()

// Toggle dark mode
const toggleDarkMode = () => {
  colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
}
</script>
```

## Configuration

### App Configuration (`app.config.ts`)

```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',      // Primary color scheme
      neutral: 'slate'      // Neutral color scheme
    }
  }
})
```

**Available Primary Colors:**
- `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`

**Available Neutral Colors:**
- `slate`, `gray`, `zinc`, `neutral`, `stone`

### Module Configuration (`nuxt.config.ts`)

```typescript
export default defineNuxtConfig({
  modules: ["@nuxt/ui-pro"],           // Nuxt UI Pro components
  css: ["@starter-nuxt-amplify-saas/uix/assets/css/main.css"]  // Core styles
})
```

## Usage Examples

### Basic Component Usage

```vue
<template>
  <div class="space-y-6">
    <!-- Dashboard Layout -->
    <UDashboardPage>
      <UDashboardPanel>
        <UDashboardNavbar title="Dashboard" />
        
        <UDashboardPanelContent>
          <!-- Cards -->
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <UDashboardCard 
              title="Metric 1"
              description="Description here"
            >
              <template #content>
                <div class="text-2xl font-bold text-primary-600">
                  $12,345
                </div>
              </template>
            </UDashboardCard>
          </div>
          
          <!-- Forms -->
          <UCard>
            <template #header>
              <h3 class="text-lg font-medium">Settings</h3>
            </template>
            
            <div class="space-y-4">
              <UInput 
                label="Email"
                placeholder="user@example.com"
              />
              
              <UTextarea 
                label="Description"
                placeholder="Enter description..."
              />
              
              <div class="flex gap-3">
                <UButton color="primary">
                  Save Changes
                </UButton>
                <UButton color="neutral" variant="outline">
                  Cancel
                </UButton>
              </div>
            </div>
          </UCard>
        </UDashboardPanelContent>
      </UDashboardPanel>
    </UDashboardPage>
  </div>
</template>
```

### Custom Styling with Tailwind

```vue
<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <!-- Hero Section -->
    <section class="py-16 px-6">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
          Welcome to Our SaaS
        </h1>
        <p class="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
          Build amazing applications with our platform
        </p>
        
        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <UButton size="lg" color="primary">
            Get Started
          </UButton>
          <UButton size="lg" color="neutral" variant="outline">
            Learn More
          </UButton>
        </div>
      </div>
    </section>
    
    <!-- Feature Grid -->
    <section class="py-16 px-6 bg-white dark:bg-neutral-800">
      <div class="max-w-6xl mx-auto">
        <h2 class="text-3xl font-bold text-center mb-12">
          Features
        </h2>
        
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div 
            v-for="feature in features" 
            :key="feature.title"
            class="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700"
          >
            <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
              <UIcon :name="feature.icon" class="text-primary-600 dark:text-primary-400" />
            </div>
            
            <h3 class="text-lg font-semibold mb-2">
              {{ feature.title }}
            </h3>
            <p class="text-neutral-600 dark:text-neutral-400">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const features = [
  {
    title: 'Fast & Reliable',
    description: 'Built with modern technologies for optimal performance',
    icon: 'i-lucide-zap'
  },
  {
    title: 'Secure',
    description: 'Enterprise-grade security with AWS Amplify',
    icon: 'i-lucide-shield'
  },
  {
    title: 'Scalable',
    description: 'Grows with your business needs',
    icon: 'i-lucide-trending-up'
  }
]
</script>
```

### Responsive Design Patterns

```vue
<template>
  <div class="container mx-auto px-4">
    <!-- Responsive Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <UCard v-for="item in items" :key="item.id">
        <!-- Card content -->
      </UCard>
    </div>
    
    <!-- Responsive Navigation -->
    <nav class="flex flex-col sm:flex-row gap-2 sm:gap-4">
      <UButton 
        v-for="link in navLinks" 
        :key="link.path"
        :to="link.path"
        variant="ghost"
        class="justify-start sm:justify-center"
      >
        {{ link.label }}
      </UButton>
    </nav>
    
    <!-- Mobile-First Layout -->
    <div class="space-y-6 lg:flex lg:space-y-0 lg:space-x-8">
      <!-- Main Content -->
      <main class="flex-1">
        <slot />
      </main>
      
      <!-- Sidebar -->
      <aside class="lg:w-80">
        <!-- Sidebar content -->
      </aside>
    </div>
  </div>
</template>
```

## Customization

### Changing Colors

#### Method 1: App Configuration
```typescript
// app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',    // Switch to green theme
      neutral: 'zinc'      // Switch to zinc neutrals
    }
  }
})
```

#### Method 2: CSS Custom Properties
```css
/* assets/css/main.css - Add custom colors */
@theme {
  /* Custom brand colors */
  --color-brand-50: #f0f9ff;
  --color-brand-500: #3b82f6;
  --color-brand-950: #172554;
  
  /* Override existing colors */
  --color-primary-500: var(--color-brand-500);
}
```

### Custom Typography

```css
/* assets/css/main.css */
@theme {
  /* Custom fonts */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Custom font sizes */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  /* ... */
}
```

### Extending Components

```vue
<!-- components/CustomCard.vue -->
<template>
  <UCard 
    :class="[
      'custom-card',
      variant === 'featured' && 'ring-2 ring-primary-200'
    ]"
    v-bind="$attrs"
  >
    <slot />
  </UCard>
</template>

<script setup>
interface Props {
  variant?: 'default' | 'featured'
}

withDefaults(defineProps<Props>(), {
  variant: 'default'
})
</script>

<style scoped>
.custom-card {
  @apply transition-all duration-200 hover:shadow-lg;
}
</style>
```

### Theme Switching

```vue
<template>
  <UDropdownMenu :items="themeItems">
    <UButton variant="ghost" :icon="currentThemeIcon">
      {{ currentThemeLabel }}
    </UButton>
  </UDropdownMenu>
</template>

<script setup>
const colorMode = useColorMode()

const themes = [
  { value: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide-moon' },
  { value: 'system', label: 'System', icon: 'i-lucide-monitor' }
]

const themeItems = computed(() => [themes.map(theme => ({
  label: theme.label,
  icon: theme.icon,
  type: 'checkbox',
  checked: colorMode.preference === theme.value,
  onSelect: () => setTheme(theme.value)
}))])

const currentTheme = computed(() => 
  themes.find(t => t.value === colorMode.preference) || themes[0]
)

const currentThemeIcon = computed(() => currentTheme.value.icon)
const currentThemeLabel = computed(() => currentTheme.value.label)

const setTheme = (theme: string) => {
  colorMode.preference = theme
}
</script>
```

This UIX layer provides a comprehensive design foundation that's both powerful and flexible, allowing for consistent UI development while remaining easily customizable.