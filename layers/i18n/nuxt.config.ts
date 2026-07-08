export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    // Base configuration common to all layers
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    lazy: true,
    // @nuxtjs/i18n v9+ defaults `restructureDir: 'i18n'` + `langDir: 'locales'`,
    // resolving to `<layer>/i18n/locales` — which is exactly this layer's
    // physical layout, so no explicit langDir override is needed anymore
    // (v8's explicit 'i18n/locales' would now double-resolve to
    // `<layer>/i18n/i18n/locales`).

    // Common number formats
    numberFormats: {
      en: {
        currency: { 
          style: 'currency', 
          currency: 'USD', 
          notation: 'standard' 
        },
        decimal: { 
          style: 'decimal', 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        },
        percent: { 
          style: 'percent', 
          useGrouping: false 
        }
      },
      es: {
        currency: { 
          style: 'currency', 
          currency: 'EUR', 
          notation: 'standard' 
        },
        decimal: { 
          style: 'decimal', 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        },
        percent: { 
          style: 'percent', 
          useGrouping: false 
        }
      }
    },
    
    // Common date/time formats
    dateTimeFormats: {
      en: {
        short: { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        },
        long: { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          weekday: 'long' 
        }
      },
      es: {
        short: { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        },
        long: { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          weekday: 'long' 
        }
      }
    },
    
    // Base locales - each layer can add its own locale files
    locales: [
      {
        code: 'en',
        language: 'en-US',
        name: 'English',
        file: 'en/common.json'
      },
      {
        code: 'es',
        language: 'es-ES',
        name: 'Español',
        file: 'es/common.json'
      }
    ]
  }
})