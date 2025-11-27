export default defineAppConfig({
  billing: {},
  // Instance-specific UI configuration
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    }
  },
  dashboard: {
    navigation: {
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
      }, {
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
          label: 'Workspaces',
          to: '/settings/workspaces'
        }, {
          label: 'Members',
          to: '/settings/members'
        }, {
          label: 'Notifications',
          to: '/settings/notifications'
        }, {
          label: 'Security',
          to: '/settings/security'
        }, {
          label: 'Billing',
          to: '/settings/billing'
        }]
      }], [{
        label: 'Feedback',
        icon: 'i-lucide-message-circle',
        to: 'https://github.com/nuxt-ui-pro/dashboard',
        target: '_blank'
      }, {
        label: 'Help & Support',
        icon: 'i-lucide-info',
        to: 'https://github.com/nuxt/ui-pro',
        target: '_blank'
      }]]
    }
  }
})
