// The `saas` app-config augmentation (types/saas-config.ts) is not reliably
// loaded into this file's program, so `defineAppConfig`'s AppConfigInput
// constraint rejects the `saas` key. Narrow structural cast keeps the object
// verbatim; typed access stays available to consumers via useSaasConfig().
export default defineAppConfig({
  saas: {
    brand: {
      name: 'SaaS App',
      logo: '/logo.svg',
      description: 'Professional SaaS Application',
      favicon: '/favicon.ico'
    },
    // Navigation items are exported from config/navigation.ts
    // Applications can import and compose them in their app.config.ts
    navigation: {},
    features: {
      multiWorkspace: true,
      workspaceSwitcher: true,
      onboarding: true,
      darkMode: true
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
} as unknown as import('nuxt/schema').AppConfigInput)
