import { describe, expect, it } from 'vitest'
import { PERMISSIONS, ROLE_PERMISSIONS } from '../../config/permissions'

describe('Permissions Configuration', () => {
  it('should have valid permission definitions', () => {
    for (const [id, def] of Object.entries(PERMISSIONS)) {
      expect(def.id).toBe(id)
      expect(def.name).toBeDefined()
      expect(def.description).toBeDefined()
      expect(def.requiredRole).toBeDefined()
    }
  })

  it('should have valid role mappings', () => {
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      expect(Array.isArray(permissions)).toBe(true)
      // Verify all permissions exist in PERMISSIONS
      permissions.forEach(p => {
        expect(PERMISSIONS[p]).toBeDefined()
      })
    }
  })

  it('should enforce role hierarchy', () => {
    // Admin should have all user permissions
    const userPerms = ROLE_PERMISSIONS.user
    const adminPerms = ROLE_PERMISSIONS.admin

    userPerms.forEach(p => {
      expect(adminPerms).toContain(p)
    })

    // Owner should have all admin permissions
    const ownerPerms = ROLE_PERMISSIONS.owner

    adminPerms.forEach(p => {
      expect(ownerPerms).toContain(p)
    })
  })
})
