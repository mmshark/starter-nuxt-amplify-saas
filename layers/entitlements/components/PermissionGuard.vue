<script setup lang="ts">
import type { Permission } from '../types/entitlements'
import { useEntitlements } from '../composables/useEntitlements'

const props = withDefaults(defineProps<{
  permission: Permission | Permission[]
  requireAll?: boolean
  fallback?: boolean
}>(), {
  requireAll: true,
  fallback: false
})

const { hasPermission, hasAllPermissions, hasAnyPermission } = useEntitlements()

const hasAccess = computed(() => {
  const perms = Array.isArray(props.permission) ? props.permission : [props.permission]

  if (props.requireAll) {
    return hasAllPermissions(perms)
  } else {
    return hasAnyPermission(perms)
  }
})
</script>

<template>
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else-if="fallback || $slots.fallback">
    <slot name="fallback" />
  </div>
</template>
