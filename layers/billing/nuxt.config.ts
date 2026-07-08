export default defineNuxtConfig({
  runtimeConfig: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      // NOTE: the Stripe webhook is NOT handled by Nitro anymore — it is the
      // stripe-webhook Lambda's public Function URL, which verifies the
      // Stripe signature itself with the STRIPE_WEBHOOK_SECRET Amplify
      // secret (see apps/backend/amplify/functions/stripe-webhook/).
    },
    public: {
      // Base URL used to build Stripe checkout/portal redirect URLs.
      // Deliberately NOT derived from request Host/X-Forwarded-* headers
      // (those are attacker-controlled) — see Phase 3 Task 3.2.
      appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
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
