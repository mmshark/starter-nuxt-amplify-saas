// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

/**
 * Repo-wide flat ESLint config.
 *
 * This is a monorepo of three Nuxt apps (`apps/saas`, `apps/landing`,
 * `apps/backend`) and nine source-consumed Nuxt layers (`layers/*`), each
 * with its own `nuxt.config.ts` but no built `.nuxt/` output checked in.
 * Rather than wiring the `@nuxt/eslint` Nuxt *module* (which generates its
 * config from a single app's resolved Nuxt context via `nuxt prepare`), this
 * uses the standalone `@nuxt/eslint-config` flat-config factory so one
 * config can lint every app and layer without requiring a live Amplify
 * sandbox or a built Nuxt instance.
 */
export default createConfigForNuxt({
  features: {
    // Basic JS/TS/Vue rules — this is not a Nuxt module/library package.
    tooling: false,
    // Formatting/whitespace rules are deliberately left off: the existing
    // codebase has no Prettier/stylistic convention enforced today, and
    // reformatting every file is out of scope for this pass.
    stylistic: false,
  },
})
  .append(
    {
      name: 'repo/ignores',
      ignores: [
        '**/.nuxt/**',
        '**/.output/**',
        '**/.data/**',
        '**/.amplify/**',
        '**/.playwright/**',
        '**/dist/**',
        '**/coverage/**',
        '**/node_modules/**',
        '**/*.min.js',
        'apps/backend/amplify/**/*.d.ts',
        '**/amplify_outputs.json',
        '**/pnpm-lock.yaml',
      ],
    },
    {
      name: 'repo/rules',
      rules: {
        // The codebase leans on `any` extensively at Amplify/Cognito/Stripe
        // SDK boundaries (raw session/token/event payloads). Flagging every
        // occurrence as an error would be pure churn for this pass — keep it
        // visible as a warning instead of silencing it outright.
        '@typescript-eslint/no-explicit-any': 'warn',
        // Same rationale: don't block on pre-existing unused args/vars, but
        // don't hide them either. Allow the common `_foo` convention. The
        // Playwright e2e helpers/specs also swallow errors via bare
        // `catch (e) { ... }` in ~150 places (deliberate — a failed selector
        // probe/redirect-wait is expected control flow there, not a bug), so
        // unused caught-error bindings are exempted rather than renamed
        // wholesale across files this plan otherwise only touches for 8.3.
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
        ],
        // The plain-JS `no-unused-vars` core rule duplicates every finding
        // the TypeScript-aware rule above already reports (and, unlike it,
        // has no `_`-prefix/caught-error carve-outs) — rely on the TS rule
        // as the single source of truth for both `.ts` and `.js` files.
        'no-unused-vars': 'off',
        // Empty `catch {}` blocks are used deliberately as a "best effort,
        // ignore failure" idiom (e.g. debug-page composable probing, e2e
        // selector fallbacks) — allow that specific, common case.
        'no-empty': ['error', { allowEmptyCatch: true }],
        'vue/multi-word-component-names': 'off',
        // console.* is used deliberately throughout for server-side and
        // debug-layer logging; not worth gating on right now.
        'no-console': 'off',
      },
    },
    {
      name: 'repo/scripts-and-config',
      files: ['scripts/**/*.{js,mjs,cjs,ts}', '*.config.{js,mjs,cjs,ts}', '**/*.config.{js,mjs,cjs,ts}'],
      rules: {
        'no-console': 'off',
      },
    },
  )
