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
    '@mmshark/uix-layer',
    '@mmshark/i18n-layer'
  ],

  // Configuración i18n específica de billing - se auto-merge con la layer base
  i18n: {
    locales: [
      { code: 'en', file: 'en/billing.json' },
      { code: 'es', file: 'es/billing.json' }
    ]
  }
})
