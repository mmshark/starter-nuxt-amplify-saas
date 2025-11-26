/**
 * Initialize user authentication state on app startup (client-side only)
 *
 * This plugin runs once when the Nuxt app initializes in the browser.
 * It checks if there's an authenticated session and loads user data automatically.
 *
 * WHY THIS PLUGIN EXISTS:
 * =======================
 * - Predictable initialization: Runs once at app startup, not on first component mount
 * - Consistent behavior: Always checks auth state when app loads
 * - Explicit timing: Clear when authentication check happens
 * - Better than onMounted: Doesn't depend on which component mounts first
 *
 * BEHAVIOR:
 * =========
 * - Silently checks for existing session (no user-facing loading state)
 * - If user is authenticated, loads their profile data
 * - If no session exists, does nothing (user remains unauthenticated)
 * - Errors are logged but don't block app initialization
 * - Sets up periodic session refresh for authenticated users (every 30 minutes)
 *
 * NOTE: This only runs on the client side. Server-side user data loading
 * happens in middleware or server routes as needed.
 */
export default defineNuxtPlugin({
  name: 'auth',
  parallel: true, // Can run in parallel with other plugins
  async setup() {
    const { fetchUser, isAuthenticated } = useUser()

    try {
      // Silently check for existing authentication session
      // This populates user state if tokens exist in cookies
      await fetchUser()

      // Set up periodic session refresh for authenticated users
      if (isAuthenticated.value) {
        // Refresh session every 30 minutes to keep tokens valid
        setInterval(async () => {
          try {
            await fetchUser()
          } catch (error) {
            console.error('Failed to refresh user session:', error)
          }
        }, 30 * 60 * 1000)
      }
    } catch (error) {
      // Log error but don't block app initialization
      // The user will simply appear as unauthenticated
      console.error('Failed to initialize user session:', error)
    }
  }
})
