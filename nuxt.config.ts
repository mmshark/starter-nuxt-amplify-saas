import Aura from '@primevue/themes/aura';

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@primevue/nuxt-module'
  ],
  tailwindcss: {
    config: {
      darkMode: 'class',
      plugins: [
        require('tailwindcss-primeui')
      ]
    }
  },
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          prefix: 'p',
          darkModeSelector: 'system',
          cssLayer: false
        }
      }
    }
  }
})