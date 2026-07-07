// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  css: ["@mmshark/uix-layer/assets/css/main.css"],

  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  }
})
