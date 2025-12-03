import path from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    // Use SaaS meta-layer (includes all necessary layers)
    '@starter-nuxt-amplify-saas/saas',

    // Debug layer (optional development tool)
    '@starter-nuxt-amplify-saas/debug'
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
    externals: {
      inline: ['vue', 'vue/server-renderer', '@vue/runtime-dom', '@vue/shared']
    },
    bundledStorage: ['@iconify-json/lucide']
  }
})
