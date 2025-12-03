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
})
