import type { NavigationMenuItem } from '@nuxt/ui'
import { settingsSidebar, userMenuItems } from '@mmshark/saas-layer/config/navigation'

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
        },
        settingsSidebar  // Imported from saas layer
        ]]
      },
      // Header navigation (empty for now)
      header: [],
      // User menu configuration
      // Cast via `unknown`: the custom entries carry sentinel `type` values
      // (`theme-selector`/`appearance-selector`) that `NavigationMenuItem` does
      // not allow; the UserMenu component reads them at runtime. Data unchanged.
      userMenu: ([
        // User profile items from layer
        ...userMenuItems,
        // App-specific items
        [{
          label: 'Theme',
          icon: 'i-lucide-palette',
          // Theme configuration will be handled dynamically in component
          type: 'theme-selector'
        }, {
          label: 'Appearance',
          icon: 'i-lucide-sun-moon',
          // Appearance will be handled dynamically in component
          type: 'appearance-selector'
        }]
      ] as unknown as NavigationMenuItem[][])
    },
    theme: {
      colors: {
        primary: 'blue',
        neutral: 'slate'
      }
    }
  }
  // saas app-config augmentation isn't loaded here; cast to the base AppConfigInput keeps the object verbatim
} as unknown as import('nuxt/schema').AppConfigInput)
