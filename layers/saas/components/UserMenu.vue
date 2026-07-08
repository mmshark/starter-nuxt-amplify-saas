<template>
  <UDropdownMenu :items="menuItems">
    <UButton
      variant="ghost"
      color="neutral"
      class="flex items-center gap-2"
      data-testid="user-menu"
    >
      <!-- Avatar -->
      <UAvatar
        :src="userAttributes?.picture"
        :alt="userName"
        size="sm"
      />

      <!-- User Name (hidden on mobile) -->
      <span class="hidden md:inline">{{ userName }}</span>

      <!-- Dropdown Icon -->
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const config = useSaasConfig()
const { currentUser, userAttributes, signOut } = useUser()
const router = useRouter()

// User display name
const userName = computed(() =>
  userAttributes.value?.name ||
  currentUser.value?.username ||
  'User'
)

// Build menu items from configuration + sign out action
const menuItems = computed<DropdownMenuItem[][]>(() => {
  const configItems = (config.navigation?.userMenu || []).map(group =>
    group.map(item => ({
      label: item.label,
      icon: item.icon,
      to: item.to
    }))
  )

  // Add sign out action as last group
  return [
    ...configItems,
    [
      {
        label: 'Sign Out',
        icon: 'i-lucide-log-out',
        onSelect: async () => {
          await signOut()
          router.push('/auth/login')
        }
      }
    ]
  ]
})
</script>
