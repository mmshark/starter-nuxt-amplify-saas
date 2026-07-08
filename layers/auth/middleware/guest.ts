import { getRedirectUrl } from '../utils'

export default defineNuxtRouteMiddleware(async (to) => {
  const { fetchUser, isAuthenticated } = import.meta.server ? useUserServer() : useUser()

  // Get the current event from Nuxt context for server-side execution
  const event = import.meta.server ? useRequestEvent() : undefined

  // Check authentication session using proper SSR-compatible method
  await fetchUser(event)

  // If authenticated, redirect to dashboard
  if (isAuthenticated.value) {
    const redirectTo = getRedirectUrl(to.query)
    return navigateTo(redirectTo, { replace: true })
  }
})
