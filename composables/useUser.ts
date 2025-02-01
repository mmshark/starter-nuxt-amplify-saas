import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth'

/**
 * Composable for managing user data and attributes
 * 
 * @returns {Object} User data and methods
 * @property {Ref<string>} firstName - User's first name
 * @property {Ref<string>} lastName - User's last name 
 * @property {Ref<string>} email - User's email
 * @property {Ref<boolean>} loading - Loading state indicator
 * @property {Ref<Error|null>} error - Error state
 * @property {ComputedRef<string>} fullName - Computed full name from first and last name
 * @property {ComputedRef<string>} avatarInitials - Computed initials for avatar
 * @property {Function} fetchUser - Method to fetch user attributes
 * @property {Function} updateUser - Method to update user attributes
 * 
 * @example
 * Basic usage:
 * ```ts
 * const { 
 *   firstName, 
 *   lastName,
 *   email,
 *   loading,
 *   fullName,
 *   avatarInitials,
 *   fetchUser,
 *   updateUser
 * } = useUser();
 * 
 * // Fetch user data
 * await fetchUser();
 * 
 * // Update user attributes
 * await updateUser({
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * ```
 */
export function useUser() {
  const firstName = ref('')
  const lastName = ref('')
  const email = ref('')
  const loading = ref(false)
  const error = ref(null)

  const fullName = computed(() => {
    return `${firstName.value} ${lastName.value}`.trim() || email.value
  })

  const avatarInitials = computed(() => {
    if (fullName.value && fullName.value !== email.value) {
      return fullName.value
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
    }
    return email.value ? email.value[0].toUpperCase() : ''
  })

  const fetchUser = async () => {
    loading.value = true
    error.value = null
    try {
      const attributes = await fetchUserAttributes()
      firstName.value = attributes.given_name || ''
      lastName.value = attributes.family_name || ''
      email.value = attributes.email || ''
      return attributes
    } catch (err) {
      error.value = err
      console.error('Error fetching user:', err)
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (updates: { firstName?: string, lastName?: string }) => {
    loading.value = true
    error.value = null
    try {
      await updateUserAttributes({
        userAttributes: {
          given_name: updates.firstName || firstName.value,
          family_name: updates.lastName || lastName.value
        }
      })
      firstName.value = updates.firstName || firstName.value
      lastName.value = updates.lastName || lastName.value
      return true
    } catch (err) {
      error.value = err
      console.error('Error updating user:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    firstName,
    lastName,
    email,
    loading,
    error,
    fullName,
    avatarInitials,
    fetchUser,
    updateUser
  }
}
