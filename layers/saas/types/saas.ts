export interface SaasConfig {
  brand: {
    name: string
    logo: string
    description: string
    favicon: string
  }
  navigation: {
    sidebar: NavigationItem[][]
    header: NavigationItem[]
    userMenu: NavigationItem[][]
  }
  features: {
    workspaceSwitcher: boolean
    onboarding: boolean
    darkMode: boolean
    multiWorkspace: boolean
  }
  layouts: {
    dashboard: {
      sidebarCollapsible: boolean
      sidebarDefaultCollapsed: boolean
    }
    auth: {
      showBranding: boolean
      showFooter: boolean
    }
  }
  theme: {
    colors: {
      primary: string
      neutral: string
    }
  }
}

export interface NavigationItem {
  label: string
  icon?: string
  to?: string
  click?: () => void
  badge?: string
}
