<script setup lang="ts">
/**
 * PermissionGuard Component
 *
 * Guard component for permission-based rendering.
 * Shows content only if user has required permissions.
 */

import type { Permission } from '../types/entitlements'

interface Props {
  permission: Permission | Permission[]
  requireAll?: boolean
  fallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  requireAll: true,
})

const slots = defineSlots<{
  default(): any
  fallback(): any
}>()

const { hasPermission } = useEntitlements()

const hasAccess = computed(() => {
  const permissions = Array.isArray(props.permission) ? props.permission : [props.permission]

  if (props.requireAll) {
    // User must have ALL specified permissions
    return permissions.every(p => hasPermission(p))
  } else {
    // User must have AT LEAST ONE specified permission
    return permissions.some(p => hasPermission(p))
  }
})
</script>

<template>
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else-if="slots.fallback || fallback">
    <slot name="fallback" />
  </div>
</template>
