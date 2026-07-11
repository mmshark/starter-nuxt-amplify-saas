import { defineConfig } from 'vitest/config'

// Unit-test config for the layers' pure logic (composables, utils, server
// guards). Runs in a plain Node environment with globals enabled; Nuxt
// auto-imports used by the units under test are stubbed per-test.
// Playwright e2e specs live under apps/saas/tests/e2e and are excluded here.
export default defineConfig({
  // The layers have no per-layer `.nuxt/tsconfig.app.json` (nuxt prepare only
  // runs for the apps), so stop esbuild from walking up to discover one.
  esbuild: { tsconfigRaw: '{}' },
  test: {
    environment: 'node',
    globals: true,
    include: ['config/**/__tests__/**/*.test.ts', 'layers/**/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
})
