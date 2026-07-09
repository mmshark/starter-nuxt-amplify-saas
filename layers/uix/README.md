# UIX Layer

UI foundation layer for Nuxt 4 applications. This layer registers the
component library (`@nuxt/ui` v4, MIT) and ships the
shared theme tokens (colors, typography, dark-mode background) that every app
and downstream layer inherits.

> **Scope note:** this layer is intentionally thin. It contains only a
> `nuxt.config.ts` (module + CSS registration) and `assets/css/main.css`
> (theme tokens). It does **not** define components, composables, or a
> config of its own — components come from `@nuxt/ui`, and per-app color
> overrides live in the consuming app. The design-system aspirations
> (documented, not yet all built) live in [`.context/prd/uix.md`](../../.context/prd/uix.md).

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Design System](#design-system)
- [Usage Examples](#usage-examples)
- [Customization](#customization)

## Overview

The UIX layer establishes the design foundation providing:

- 🧩 **`@nuxt/ui` v4 (MIT)** — the full component set, including the
  `UDashboard*` shell primitives used by the SaaS layout
- 🌈 **Design Tokens** — a shared color palette and typography via CSS `@theme`
- 🌙 **Dark Mode** — built-in dark/light theming (a `--ui-bg` override for dark)
- ⚡ **Tailwind CSS v4** — utility-first styling (pulled in by `@nuxt/ui`)
- 🎭 **Custom Brand Palette** — a green palette and the Public Sans font
- 🎯 **Lucide icons** — bundled server-side for offline/SSR icon rendering

## Architecture

```
layers/uix/
├── assets/css/
│   └── main.css         # Tailwind + @nuxt/ui import; @theme tokens; dark override
├── nuxt.config.ts       # Registers @nuxt/ui, main.css, and the lucide icon bundle
├── package.json         # Layer dependencies
└── README.md
```

The entire layer configuration is:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  css: ["@mmshark/uix-layer/assets/css/main.css"],
  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  }
})
```

## Design System

### Color Palette

Colors are defined as CSS custom properties in `assets/css/main.css` via
Tailwind's `@theme` block. The base color scheme (primary / neutral) comes
from `@nuxt/ui`'s own defaults; this layer adds a custom **green** brand
palette on top:

```css
/* assets/css/main.css — green palette (custom brand colors) */
--color-green-50: #EFFDF5    /* Lightest */
--color-green-400: #00DC82   /* Brand accent */
--color-green-500: #00C16A   /* Primary brand */
--color-green-950: #052E16   /* Darkest */
```

```vue
<template>
  <!-- @nuxt/ui semantic color -->
  <UButton color="primary">Primary Action</UButton>

  <!-- custom brand color utilities -->
  <div class="bg-green-50 text-green-800 border-green-200">
    Success message
  </div>
</template>
```

### Typography

- **Primary Font**: `Public Sans` (set via `--font-sans` in `@theme`)
- **Fallback**: system sans-serif

```vue
<template>
  <h1 class="text-3xl font-bold">Main Title</h1>
  <p class="text-base">Regular paragraph text</p>
  <p class="text-sm text-neutral-600">Secondary text</p>
</template>
```

### Dark Mode

Dark mode ships with `@nuxt/ui` (`useColorMode()`), and this layer overrides
the dark background token:

```css
/* assets/css/main.css */
.dark {
  --ui-bg: var(--ui-color-neutral-950);
}
```

```vue
<script setup>
const colorMode = useColorMode()

const toggleDarkMode = () => {
  colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
}
</script>
```

## Usage Examples

All components below are from `@nuxt/ui` v4 (MIT). The dashboard shell
primitives (`UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`,
`UDashboardNavbar`, `UDashboardSearch`) are consumed by the SaaS layer's
`layouts/default.vue`.

```vue
<template>
  <UDashboardPanel id="example">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">Metric</h3>
          </template>
          <div class="text-2xl font-bold text-primary">$12,345</div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

## Customization

### Changing Colors

Override or extend theme tokens directly in `assets/css/main.css`:

```css
/* assets/css/main.css */
@theme {
  /* Add a custom brand ramp */
  --color-brand-50: #f0f9ff;
  --color-brand-500: #3b82f6;
  --color-brand-950: #172554;
}
```

Per-app semantic color selection (e.g. which ramp `color="primary"` maps to)
is configured by the consuming app, not by this layer.

### Custom Typography

```css
/* assets/css/main.css */
@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

This UIX layer intentionally stays minimal: register the component library,
provide the theme tokens, and let apps and higher layers build on top.
