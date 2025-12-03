import { settingsSidebar, footerNavigation } from '@starter-nuxt-amplify-saas/saas/config/navigation'

export default defineAppConfig({
  // SaaS layer configuration
  saas: {
    brand: {
      name: 'Starter SaaS',
      logo: '/logo.svg',
      description: 'Nuxt Amplify SaaS Starter',
      favicon: '/favicon.ico'
    },
    navigation: {
      sidebar: {
        // Main sidebar navigation
        main: [[{
          label: 'Home',
          icon: 'i-lucide-house',
          to: '/'
        }, {
          label: 'Inbox',
          icon: 'i-lucide-inbox',
          to: '/inbox',
          badge: '4'
        }, {
          label: 'Customers',
          icon: 'i-lucide-users',
          to: '/customers'
        },
        settingsSidebar  // Imported from saas layer
        ]],
        // Footer sidebar navigation
        footer: [
          footerNavigation  // Imported from saas layer
        ]
      },
      // Header navigation (empty for now)
      header: [],
      // User menu configuration
      userMenu: [[{
        label: 'Profile',
        icon: 'i-lucide-user'
      }, {
        label: 'Billing',
        icon: 'i-lucide-credit-card'
      }, {
        label: 'Settings',
        icon: 'i-lucide-settings',
        to: '/settings'
      }], [{
        label: 'Theme',
        icon: 'i-lucide-palette',
        // Theme configuration will be handled dynamically in component
        type: 'theme-selector'
      }, {
        label: 'Appearance',
        icon: 'i-lucide-sun-moon',
        // Appearance will be handled dynamically in component
        type: 'appearance-selector'
      }], [{
        label: 'Templates',
        icon: 'i-lucide-layout-template',
        children: [{
          label: 'Starter',
          to: 'https://ui-pro-starter.nuxt.dev/'
        }, {
          label: 'Landing',
          to: 'https://landing-template.nuxt.dev/'
        }, {
          label: 'Docs',
          to: 'https://docs-template.nuxt.dev/'
        }, {
          label: 'SaaS',
          to: 'https://saas-template.nuxt.dev/'
        }, {
          label: 'Dashboard',
          to: 'https://dashboard-template.nuxt.dev/',
          checked: true,
          type: 'checkbox'
        }, {
          label: 'Chat',
          to: 'https://chat-template.nuxt.dev/'
        }]
      }], [{
        label: 'Documentation',
        icon: 'i-lucide-book-open',
        to: 'https://ui.nuxt.com/getting-started/installation/pro/nuxt',
        target: '_blank'
      }, {
        label: 'GitHub repository',
        icon: 'i-simple-icons-github',
        to: 'https://github.com/nuxt-ui-pro/dashboard',
        target: '_blank'
      }, {
        label: 'Upgrade to Pro',
        icon: 'i-lucide-rocket',
        to: 'https://ui.nuxt.com/pro/purchase',
        target: '_blank'
      }]]
    },
    theme: {
      colors: {
        primary: 'blue',
        neutral: 'slate'
      }
    }
  }
})
