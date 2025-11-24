# Pattern: Nuxt Layers Architecture

## Context
In a monorepo structure, code reuse and separation of concerns are critical. We need a standardized way to organize code that can be shared across multiple applications (SaaS, Landing, Admin) while maintaining isolation and clear boundaries.

## Problem
- **Code Duplication**: Without a shared structure, utilities and components are copied between apps.
- **Inconsistency**: Different parts of the codebase use different structures, making it hard to navigate.
- **Dependency Hell**: Circular dependencies and unclear ownership of code.

## Solution
Use **Nuxt Layers** as the fundamental unit of reuse. Each layer encapsulates a specific domain (e.g., Auth, Billing, UI) and provides a public API via composables, components, and server routes.

## Pattern Details

### Standard Structure
Each layer must follow this directory structure:

```text
layers/<layer>/
  nuxt.config.ts          # Layer config (runtimeConfig, i18n merge, module opts)
  package.json           # Name: @your-org/<layer>
  README.md              # Public API, usage, caveats
  components/            # Reusable UI components
  composables/           # SSR-safe composables
  plugins/               # Client/server plugins (numbered for order)
  server/
    api/<layer>/...      # Namespaced routes
    utils/               # Server-only helpers
  utils/                 # Shared helpers
  types/                 # d.ts module augmentation
  i18n/locales/{en,es}/  # Layer-local translations
```

### Key Principles
1.  **Encapsulation**: Each layer owns its namespace.
2.  **Composition**: Apps extend layers via `nuxt.config.ts`.
3.  **Namespacing**: Server routes MUST be namespaced `server/api/<layer>/...`.
4.  **Exports**: Explicitly export public utilities in `package.json`.

### Example: Package.json Export
```json
{
  "name": "@your-org/auth",
  "main": "./nuxt.config.ts",
  "exports": {
    ".": "./nuxt.config.ts",
    "./server/utils/auth": "./server/utils/auth.ts"
  }
}
```

## Dependency Management

Managing dependencies in a pnpm monorepo with Nuxt Layers requires strict discipline to ensure that TypeScript resolution works correctly and that layers are truly isolated.

### Rules
1.  **Runtime Dependencies**: Any package imported in source code (`.ts`, `.vue`) MUST be in `dependencies`.
2.  **Workspace Dependencies**: Use `workspace:*` for internal layers.
3.  **Dev Dependencies**: Build tools, types, and test runners go in `devDependencies`.

### Example: package.json dependencies
```json
{
  "dependencies": {
    "@your-org/uix": "workspace:*",
    "aws-amplify": "^6.15.3",
    "@vueuse/core": "^13.9.0"
  },
  "devDependencies": {
    "nuxt": "^4.0.0",
    "typescript": "^5.8.3"
  }
}
```

### Troubleshooting
- **"Cannot find module"**: Move the package from `devDependencies` to `dependencies`.
- **IDE Errors**: Ensure the package is in `dependencies`.
```
