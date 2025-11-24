import type { Permission, PermissionDefinition } from '../types/entitlements'

export const definePermissions = (permissions: Record<Permission, Omit<PermissionDefinition, 'id'>>): Record<Permission, PermissionDefinition> => {
  const result = {} as Record<Permission, PermissionDefinition>

  for (const [key, value] of Object.entries(permissions)) {
    const id = key as Permission
    result[id] = {
      id,
      ...value
    }
  }

  return result
}
