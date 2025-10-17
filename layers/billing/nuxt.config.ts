export default defineNuxtConfig({
  runtimeConfig: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    public: {
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      }
    }
  },

  extends: [
    '@starter-nuxt-amplify-saas/uix',
    '@starter-nuxt-amplify-saas/i18n'
  ],

  // Configuración i18n específica de billing - se auto-merge con la layer base
  i18n: {
    locales: [
      { code: 'en', file: 'en/billing.json' },
      { code: 'es', file: 'es/billing.json' }
    ]
  }
})
