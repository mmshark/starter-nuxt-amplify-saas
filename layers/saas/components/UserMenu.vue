<template>
  <UDropdown :items="menuItems">
    <UButton
      variant="ghost"
      class="flex items-center gap-2"
      data-testid="user-menu"
    >
      <!-- Avatar -->
      <UAvatar
        :src="user?.attributes?.picture"
        :alt="userName"
        size="sm"
      />

      <!-- User Name (hidden on mobile) -->
      <span class="hidden md:inline">{{ userName }}</span>

      <!-- Dropdown Icon -->
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
    </UButton>
  </UDropdown>
</template>

<script setup lang="ts">
const config = useSaasConfig()
const { user, signOut } = useUser()
const router = useRouter()

// User display name
const userName = computed(() =>
  user.value?.attributes?.name ||
  user.value?.username ||
  'User'
)

// Build menu items from configuration + sign out action
const menuItems = computed(() => {
  const configItems = config.userMenu.map(group =>
    group.map(item => ({
      label: item.label,
      icon: item.icon,
      to: item.to,
      click: item.click
    }))
  )

  // Add sign out action as last group
  return [
    ...configItems,
    [
      {
        label: 'Sign Out',
        icon: 'i-lucide-log-out',
        click: async () => {
          await signOut()
          router.push('/auth/login')
        }
      }
    ]
  ]
})
</script>
