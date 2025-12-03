export default defineNuxtConfig({
  extends: [
    // Foundation layers
    '@starter-nuxt-amplify-saas/amplify',
    '@starter-nuxt-amplify-saas/uix',
    '@starter-nuxt-amplify-saas/i18n',

    // Feature layers
    '@starter-nuxt-amplify-saas/auth',
    '@starter-nuxt-amplify-saas/billing',
    '@starter-nuxt-amplify-saas/workspaces',
    '@starter-nuxt-amplify-saas/entitlements',
  ],
})
