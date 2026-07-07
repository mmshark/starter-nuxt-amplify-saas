import path from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@mmshark/uix-layer',
    '@mmshark/amplify-layer'
  ],
  alias: {
    '@': path.resolve(__dirname)
  }
})
