# Product Requirement Document: Centralized Layer Configuration

## 1. Introduction

### 1.1 Purpose
The goal is to establish a unified configuration strategy for the SaaS application. This allows developers to configure all underlying layers (UIX, Auth, Billing, etc.) from a single location within the consuming application (e.g., `apps/saas`), overriding defaults defined by the layers themselves.

### 1.2 Problem Statement
Currently, configuration is scattered across multiple `nuxt.config.ts` files or hardcoded within layers. There is no central place to "theme" or "configure" the SaaS behavior (e.g., primary colors, auth redirects, billing providers) without modifying the layer code directly.

### 1.3 Goals
- **Centralization**: All layer configurations accessible via a single config object (e.g., `app.config.ts`).
- **Overridability**: Applications can easily override layer defaults.
- **Type Safety**: Full TypeScript support for configuration keys.
- **Separation of Concerns**: Runtime config (public/reactive) vs. Build/Env config (private/static).

## 2. Architecture

### 2.1 Strategy: `app.config.ts` vs `nuxt.config.ts`

We will use a hybrid approach leveraging Nuxt's distinct configuration capabilities:

| Feature | `app.config.ts` | `nuxt.config.ts` (`runtimeConfig`) |
| :--- | :--- | :--- |
| **Use Case** | UI theming, feature flags, public behavior | Secrets, environment variables, build options |
| **Reactivity** | Reactive (can change at runtime client-side) | Static (hydrated at server start) |
| **Typing** | Fully typed via `AppConfigInput` | Typed via `NuxtConfig` |
| **Layer Support**| Merges automatically (Layer < App) | Merges automatically |

### 2.2 The `saas` Config Key
All layers will expose their configuration under a unified `saas` namespace in `app.config.ts`.

```typescript
// Structure
export default defineAppConfig({
  saas: {
    uix: { ... },
    auth: { ... },
    billing: { ... },
    // ... other layers
  }
})
```

## 3. Implementation Details

### 3.1 Layer Responsibility
Each layer MUST:
1.  Define its default configuration in its own `app.config.ts`.
2.  Extend the `AppConfig` interface in a `types/config.d.ts` file to ensure type safety.

**Example: `layers/uix/app.config.ts`**
```typescript
export default defineAppConfig({
  saas: {
    uix: {
      colors: {
        primary: 'indigo',
        gray: 'slate'
      },
      logo: {
        light: '/logo-light.svg',
        dark: '/logo-dark.svg'
      }
    }
  }
})
```

**Example: `layers/uix/types/config.d.ts`**
```typescript
declare module 'nuxt/schema' {
  interface AppConfigInput {
    saas?: {
      uix?: {
        colors?: {
          primary?: string
          gray?: string
        }
        logo?: {
          light?: string
          dark?: string
        }
      }
    }
  }
}
```

### 3.2 Application Responsibility
The consuming application (e.g., `apps/saas`) overrides these values in its `app.config.ts`.

**Example: `apps/saas/app.config.ts`**
```typescript
export default defineAppConfig({
  saas: {
    uix: {
      colors: {
        primary: 'blue' // Overrides 'indigo'
      }
    },
    auth: {
      redirects: {
        login: '/dashboard'
      }
    }
  }
})
```

### 3.3 Accessing Configuration
Components and composables access configuration via `useAppConfig()`.

```typescript
const appConfig = useAppConfig()
console.log(appConfig.saas.uix.colors.primary) // 'blue'
```

## 4. Scope of Configuration

### 4.1 UIX Layer
- **Colors**: Primary and gray palette overrides.
- **Logo**: Paths for light/dark mode logos.
- **Components**: Default props for global components (e.g., button variants).

### 4.2 Auth Layer
- **Redirects**: Login, logout, and callback URLs.
- **Behavior**: Auto-redirect on 401, guest mode behavior.
- **UI**: Show/hide specific auth providers (Google, GitHub) if handled via UI config.

### 4.3 Billing Layer
- **Features**: Toggle specific billing features (e.g., "show invoices").
- **Redirects**: Portal return URLs.

### 4.4 Workspaces Layer
- **Limits**: Default member limits (if not enforced by backend).
- **Features**: Enable/disable specific workspace features.

## 5. Environment Variables (`nuxt.config.ts`)
Secrets and environment-specific values (API keys, backend URLs) remain in `nuxt.config.ts` via `runtimeConfig`.

```typescript
// apps/saas/nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBase: '', // Overridden by NUXT_PUBLIC_API_BASE
    },
    stripeSecretKey: '' // Overridden by NUXT_STRIPE_SECRET_KEY
  }
})
```

## 6. Migration Plan
1.  **Define Types**: Create `types/config.d.ts` in each layer.
2.  **Move Defaults**: Migrate hardcoded values to `layers/<layer>/app.config.ts`.
3.  **Update Usage**: Refactor components to use `useAppConfig().saas.<layer>...`.
4.  **Document**: Update `README.md` in each layer with available config options.
