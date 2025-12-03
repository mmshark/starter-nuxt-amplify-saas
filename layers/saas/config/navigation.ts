import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * Navigation configuration for the SaaS layer
 *
 * These are pre-composed navigation items that can be imported and used
 * in app.config.ts at build time for menu composition.
 */

/**
 * Settings sidebar menu with all common settings sections
 */
export const settingsSidebar: NavigationMenuItem = {
  label: 'Settings',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: 'General',
    to: '/settings',
    exact: true
  }, {
    label: 'Members',
    to: '/settings/members'
  }, {
    label: 'Billing',
    to: '/settings/billing'
  }, {
    label: 'Workspaces',
    to: '/settings/workspaces'
  }]
}

/**
 * Profile sidebar menu (for profile settings pages layout)
 */
export const profileSidebar: NavigationMenuItem = {
  label: 'Profile',
  to: '/profile',
  icon: 'i-lucide-user',
  children: [{
    label: 'Profile',
    icon: 'i-lucide-user',
    to: '/profile',
    exact: true
  }, {
    label: 'Account',
    icon: 'i-lucide-settings',
    to: '/profile/account'
  }, {
    label: 'Security',
    icon: 'i-lucide-shield',
    to: '/profile/security'
  }, {
    label: 'Notifications',
    icon: 'i-lucide-bell',
    to: '/profile/notifications'
  }]
}

/**
 * User menu items for the user dropdown (extracted from profileSidebar)
 */
export const userMenuItems: NavigationMenuItem[][] = [
  profileSidebar.children || []
]

/**
 * Footer navigation items (Help & Support, etc.)
 */
export const footerNavigation: NavigationMenuItem[] = [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/nuxt-ui-pro/dashboard',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt/ui-pro',
  target: '_blank'
}]
