import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * SaaS Configuration Type Definitions
 *
 * Extends Nuxt's AppConfig with the SaaS layer configuration structure
 */

declare module 'nuxt/schema' {
  interface AppConfigInput {
    /** SaaS application configuration */
    saas?: {
      brand?: {
        name?: string
        logo?: string
        description?: string
        favicon?: string
      }
      navigation?: {
        /** Sidebar navigation */
        sidebar?: {
          /** Main sidebar navigation items (grouped) */
          main?: NavigationMenuItem[][]
          /** Footer sidebar navigation items (grouped) */
          footer?: NavigationMenuItem[][]
        }
        /** Header navigation items */
        header?: NavigationMenuItem[]
        /** User menu dropdown items (grouped) */
        userMenu?: NavigationMenuItem[][]
      }
      features?: {
        workspaceSwitcher?: boolean
        onboarding?: boolean
        darkMode?: boolean
        multiWorkspace?: boolean
      }
      layouts?: {
        dashboard?: {
          sidebarCollapsible?: boolean
          sidebarDefaultCollapsed?: boolean
        }
        auth?: {
          showBranding?: boolean
          showFooter?: boolean
        }
      }
      theme?: {
        colors?: {
          primary?: string
          neutral?: string
        }
      }
    }
  }
}

export {}
