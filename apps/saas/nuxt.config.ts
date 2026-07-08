import path from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    // Use SaaS meta-layer (includes all necessary layers)
    '@mmshark/saas-layer',

    // Debug layer (optional development tool)
    '@mmshark/debug-layer'
  ],
  alias: {
    '@': path.resolve(__dirname)
  },

  routeRules: {
    '/auth/**': { ssr: false }
  },

  // Configuración i18n específica de la app SaaS (opcional)
  i18n: {
    locales: [
      { code: 'en', file: 'en/app.json' },
      { code: 'es', file: 'es/app.json' }
    ]
  },
  nitro: {
    bundledStorage: ['@iconify-json/lucide']
  }
})
