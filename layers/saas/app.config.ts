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
