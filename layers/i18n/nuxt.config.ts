export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    // Base configuration common to all layers
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    lazy: true,
    langDir: 'i18n/locales',

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
        iso: 'en-US', 
        name: 'English', 
        file: 'en/common.json' 
      },
      { 
        code: 'es', 
        iso: 'es-ES', 
        name: 'Español', 
        file: 'es/common.json' 
      }
    ]
  }
})