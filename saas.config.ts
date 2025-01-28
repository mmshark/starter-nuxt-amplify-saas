export const sidebarNavs = {
  topNavs: [
    {
      icon: 'pi pi-home',
      label: 'Dashboard',
      subMenu: [
        {
          label: 'Analytics'
        },
        {
          label: 'Reports'
        },
        {
          label: 'Wallet'
        }
      ]
    },
    {
      icon: 'pi pi-bookmark',
      label: 'Bookmarks'
    },
    {
      icon: 'pi pi-users',
      label: 'Team'
    },
    {
      icon: 'pi pi-comments',
      label: 'Messages'
    },
    {
      icon: 'pi pi-calendar',
      label: 'Calendar'
    }
  ],
  bottomNavs: [
    {
      icon: 'pi pi-cog',
      label: 'Settings',
      subMenu: [
        {
          label: 'Profile',
          link: '/app/settings/profile'
        },
        {
          label: 'Security',
          link: '/app/settings/security'
        },
        {
          label: 'Preferences',
          link: '/app/settings/preferences'
        }
      ]
    },
    {
      icon: 'pi pi-question-circle',
      label: 'Help'
    }
  ]
}
