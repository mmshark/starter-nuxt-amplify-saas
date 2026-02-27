/**
 * Initialize user authentication state on app startup (client-side only)
 *
 * This plugin runs once when the Nuxt app initializes in the browser.
 * It checks if there's an authenticated session and loads user data automatically.
 */
export default defineNuxtPlugin({
  name: 'auth',
  parallel: true,
  async setup() {
    const { fetchUser, isAuthenticated } = useUser()

    try {
      await fetchUser()

      if (isAuthenticated.value) {
        // Use setTimeout chain instead of setInterval for safer cleanup
        let refreshTimeout: ReturnType<typeof setTimeout> | null = null

        const scheduleRefresh = () => {
          refreshTimeout = setTimeout(async () => {
            try {
              if (isAuthenticated.value) {
                await fetchUser()
                scheduleRefresh()
              }
            } catch (error) {
              console.error('Failed to refresh user session:', error)
            }
          }, 30 * 60 * 1000)
        }

        scheduleRefresh()

        // Clean up on app unmount
        const nuxtApp = useNuxtApp()
        nuxtApp.hook('app:beforeMount', () => {
          // Register cleanup on page unload
          window.addEventListener('beforeunload', () => {
            if (refreshTimeout) clearTimeout(refreshTimeout)
          })
        })
      }
    } catch (error) {
      console.error('Failed to initialize user session:', error)
    }
  }
})
