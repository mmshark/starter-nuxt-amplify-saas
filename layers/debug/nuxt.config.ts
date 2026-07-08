// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // The debug pages call composables owned by these layers (useUser from
  // auth, useBilling from billing). Declare them here, matching the same
  // pattern workspaces-layer uses for its own composable dependencies, so
  // the debug layer resolves standalone instead of only working by
  // accident when a consuming app happens to extend them first. The
  // Amplify plugin ($Amplify, generateClient) that these composables use
  // at runtime is expected to be provided by the top-level app composition
  // (e.g. @mmshark/saas-layer already extends @mmshark/amplify-layer),
  // consistent with how auth-layer/billing-layer are also not
  // self-sufficient without it.
  extends: [
    '@mmshark/auth-layer',
    '@mmshark/billing-layer'
  ]
})