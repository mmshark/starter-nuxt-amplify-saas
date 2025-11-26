/**
 * Entitlements Layer - Nuxt Configuration
 *
 * Configures the Entitlements layer for authorization and feature access control.
 */

export default defineNuxtConfig({
  imports: {
    dirs: [
      'composables',
      'config',
      'utils',
    ],
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
})
