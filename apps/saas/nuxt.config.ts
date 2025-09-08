import path from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@starter-nuxt-amplify-saas/uix',
    '@starter-nuxt-amplify-saas/amplify',
    '@starter-nuxt-amplify-saas/i18n',
    '@starter-nuxt-amplify-saas/auth',
    '@starter-nuxt-amplify-saas/billing',
    '@starter-nuxt-amplify-saas/debug'
  ],
  alias: {
    '@': path.resolve(__dirname)
  },
  
  // Configuración i18n específica de la app SaaS (opcional)
  i18n: {
    locales: [
      { code: 'en', file: 'en/app.json' },
      { code: 'es', file: 'es/app.json' }
    ]
  }
})
