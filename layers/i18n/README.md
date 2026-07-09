# I18n Layer

Internationalization (i18n) foundation layer for Nuxt 4 applications. This layer provides base i18n configuration, common translations, and formatting utilities for multi-language support.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Translation Files](#translation-files)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Overview

The I18n layer provides internationalization foundation for:

- 🌍 **Multi-language Support** - English and Spanish by default
- 📝 **Common Translations** - Shared UI text and messages
- 💱 **Currency Formatting** - Region-appropriate currency display
- 📅 **Date Formatting** - Localized date and time formats
- 🔧 **Extensible Structure** - Easy to add new languages and translations
- ⚡ **Lazy Loading** - Efficient translation loading strategy

## Architecture

```
layers/i18n/
├── i18n/locales/         # Translation files
│   ├── en/               # English translations
│   │   └── common.json   # Common UI strings
│   └── es/               # Spanish translations
│       └── common.json   # Common UI strings
├── nuxt.config.ts        # I18n module configuration
└── package.json          # Layer dependencies
```

## Configuration

### Base I18n Setup

The layer configures `@nuxtjs/i18n` module with:

- **Default Locale**: English (`en`)
- **Strategy**: `prefix_except_default` (URLs: `/`, `/es/page`)
- **Lazy Loading**: Enabled for performance
- **Supported Locales**: English (`en-US`) and Spanish (`es-ES`)

### Number Formats

```typescript
// Currency formatting
numberFormats: {
  en: { 
    currency: { style: 'currency', currency: 'USD' }
  },
  es: { 
    currency: { style: 'currency', currency: 'EUR' }
  }
}

// Usage examples:
// English: $29.99
// Spanish: 29,99 €
```

### Date Formats

```typescript
// Date formatting
dateTimeFormats: {
  en: {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
  },
  es: {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
  }
}

// Usage examples:
// English Short: Jan 15, 2024
// English Long: Monday, January 15, 2024
// Spanish Short: 15 ene 2024
// Spanish Long: lunes, 15 de enero de 2024
```

## Translation Files

### Common Translations

The layer provides shared translations for common UI elements:

#### English (`en/common.json`)
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "settings": "Settings",
    "home": "Home"
  },
  "status": {
    "active": "Active",
    "pending": "Pending",
    "completed": "Completed"
  }
}
```

#### Spanish (`es/common.json`)
```json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "loading": "Cargando...",
    "error": "Ha ocurrido un error",
    "success": "Éxito"
  },
  "navigation": {
    "dashboard": "Panel",
    "settings": "Configuración",
    "home": "Inicio"
  },
  "status": {
    "active": "Activo",
    "pending": "Pendiente",
    "completed": "Completado"
  }
}
```

### Translation Categories

- **common**: General UI elements (buttons, states, actions)
- **navigation**: Navigation labels and menu items
- **status**: Status labels and state descriptions

## Usage Examples

### Basic Text Translation

```vue
<template>
  <div>
    <!-- Using translation keys -->
    <h1>{{ $t('navigation.dashboard') }}</h1>
    <button>{{ $t('common.save') }}</button>
    <p v-if="isLoading">{{ $t('common.loading') }}</p>
    
    <!-- Status display -->
    <span :class="statusClass">
      {{ $t(`status.${currentStatus}`) }}
    </span>
  </div>
</template>

<script setup>
const { t } = useI18n()

// Alternative usage
const saveLabel = computed(() => t('common.save'))
const dashboardTitle = computed(() => t('navigation.dashboard'))
</script>
```

### Currency Formatting

```vue
<template>
  <div>
    <!-- Format currency for current locale -->
    <p>{{ $n(29.99, 'currency') }}</p>
    <!-- English: $29.99 -->
    <!-- Spanish: 29,99 € -->
    
    <!-- Decimal formatting -->
    <p>{{ $n(1234.56, 'decimal') }}</p>
    <!-- English: 1,234.56 -->
    <!-- Spanish: 1.234,56 -->
    
    <!-- Percentage -->
    <p>{{ $n(0.85, 'percent') }}</p>
    <!-- Both: 85% -->
  </div>
</template>
```

### Date Formatting

```vue
<template>
  <div>
    <!-- Short date format -->
    <p>{{ $d(new Date(), 'short') }}</p>
    <!-- English: Jan 15, 2024 -->
    <!-- Spanish: 15 ene 2024 -->
    
    <!-- Long date format -->
    <p>{{ $d(new Date(), 'long') }}</p>
    <!-- English: Monday, January 15, 2024 -->
    <!-- Spanish: lunes, 15 de enero de 2024 -->
  </div>
</template>
```

### Language Switcher Component

```vue
<template>
  <div class="language-switcher">
    <select v-model="selectedLocale" @change="changeLocale">
      <option 
        v-for="locale in availableLocales" 
        :key="locale.code"
        :value="locale.code"
      >
        {{ locale.name }}
      </option>
    </select>
  </div>
</template>

<script setup>
const { locale, locales, setLocale } = useI18n()

const selectedLocale = ref(locale.value)
const availableLocales = computed(() => locales.value)

const changeLocale = async () => {
  await setLocale(selectedLocale.value)
}
</script>
```

### Conditional Content by Language

```vue
<template>
  <div>
    <!-- Show different content based on locale -->
    <div v-if="locale === 'en'">
      <p>English-specific content</p>
    </div>
    
    <div v-else-if="locale === 'es'">
      <p>Contenido específico en español</p>
    </div>
    
    <!-- Using computed property -->
    <div class="pricing">
      <h3>{{ $t('navigation.pricing') }}</h3>
      <p>{{ localizedPrice }}</p>
    </div>
  </div>
</template>

<script setup>
const { locale } = useI18n()

const localizedPrice = computed(() => {
  const basePrice = 29.99
  return locale.value === 'es' 
    ? `${basePrice.toFixed(2)} €`
    : `$${basePrice.toFixed(2)}`
})
</script>
```

### Dynamic Translation with Parameters

```vue
<template>
  <div>
    <!-- With parameters (requires adding to translation files) -->
    <p>{{ $t('user.welcome', { name: userName }) }}</p>
    <!-- Requires: "user.welcome": "Welcome, {name}!" -->
    
    <!-- Pluralization (requires adding plural rules) -->
    <p>{{ $tc('item.count', itemCount, { count: itemCount }) }}</p>
    <!-- Requires: "item.count": "no items | {count} item | {count} items" -->
  </div>
</template>

<script setup>
const userName = ref('John')
const itemCount = ref(5)
</script>
```

### Composable for I18n Utilities

```typescript
// composables/useLocalization.ts
export const useLocalization = () => {
  const { locale, t, n, d } = useI18n()

  const formatPrice = (price: number) => {
    return n(price, 'currency')
  }

  const formatDate = (date: Date | string, format: 'short' | 'long' = 'short') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return d(dateObj, format)
  }

  const getStatusText = (status: string) => {
    return t(`status.${status}`)
  }

  const isRTL = computed(() => {
    // Add RTL language support if needed
    return ['ar', 'he', 'fa'].includes(locale.value)
  })

  return {
    locale: readonly(locale),
    formatPrice,
    formatDate,
    getStatusText,
    isRTL
  }
}
```

### Server-Side Translation

```typescript
// server/api/localized-data.get.ts
export default defineEventHandler(async (event) => {
  const locale = getCookie(event, 'i18n_redirected') || 'en'
  
  const localizedData = {
    en: { message: 'Hello from server' },
    es: { message: 'Hola desde el servidor' }
  }
  
  return {
    message: localizedData[locale]?.message || localizedData.en.message,
    locale
  }
})
```

## API Reference

### Available Composables

#### `useI18n()`
- `locale` - Current locale (reactive)
- `locales` - Available locales array
- `t(key, params?)` - Translate text
- `n(number, format)` - Format numbers
- `d(date, format)` - Format dates
- `setLocale(locale)` - Change current locale

### Translation Keys Structure

```typescript
// Common translation keys available in all layers
interface CommonTranslations {
  common: {
    save: string
    cancel: string
    delete: string
    loading: string
    error: string
    success: string
    // ... more common keys
  }
  navigation: {
    dashboard: string
    settings: string
    home: string
    // ... more navigation keys
  }
  status: {
    active: string
    inactive: string
    pending: string
    completed: string
    failed: string
    // ... more status keys
  }
}
```

### Number Formats

- `currency` - Localized currency formatting
- `decimal` - Decimal number formatting  
- `percent` - Percentage formatting

### Date Formats

- `short` - Brief date format (Jan 15, 2024)
- `long` - Full date format (Monday, January 15, 2024)

### Adding New Languages

1. **Add locale configuration**:
```typescript
// In extending layer or app
locales: [
  ...existingLocales,
  { 
    code: 'fr', 
    iso: 'fr-FR', 
    name: 'Français', 
    file: 'fr/common.json' 
  }
]
```

2. **Create translation files**:
```
i18n/locales/fr/common.json
```

3. **Add number/date formats**:
```typescript
numberFormats: {
  fr: { 
    currency: { style: 'currency', currency: 'EUR' }
  }
}
```

This i18n layer provides a solid foundation for internationalization with room for extension by other layers and applications.