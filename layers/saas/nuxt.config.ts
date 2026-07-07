export default defineNuxtConfig({
  extends: [
    // Foundation layers
    '@mmshark/amplify-layer',
    '@mmshark/uix-layer',
    '@mmshark/i18n-layer',

    // Feature layers
    '@mmshark/auth-layer',
    '@mmshark/billing-layer',
    '@mmshark/workspaces-layer',
    '@mmshark/entitlements-layer',
  ],
})
