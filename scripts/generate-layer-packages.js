#!/usr/bin/env node

/**
 * Generates package.json files for all layers with proper configuration
 * for GitHub Packages publishing
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'

const ORG_NAME = '@mmshark'
const REPO_URL = 'https://github.com/mmshark/starter-nuxt-amplify-saas'

const layers = {
  amplify: {
    description: 'AWS Amplify Gen2 integration layer with GraphQL client and storage utilities',
    keywords: ['amplify', 'aws', 'graphql', 'cognito', 'appsync'],
    peerDependencies: {
      'nuxt': '^4.0.0',
      '@aws-amplify/auth': '^6.0.0',
      '@aws-amplify/api': '^6.0.0',
      '@aws-amplify/storage': '^6.0.0'
    }
  },
  uix: {
    description: 'UI foundation layer with Nuxt UI Pro, design system, and theming',
    keywords: ['ui', 'nuxt-ui', 'tailwind', 'design-system', 'components'],
    peerDependencies: {
      'nuxt': '^4.0.0',
      '@nuxt/ui-pro': '^1.0.0',
      'tailwindcss': '^3.4.0'
    }
  },
  i18n: {
    description: 'Internationalization layer with multi-language support and formatting utilities',
    keywords: ['i18n', 'internationalization', 'localization', 'translations'],
    peerDependencies: {
      'nuxt': '^4.0.0',
      '@nuxtjs/i18n': '^8.0.0'
    }
  },
  auth: {
    description: 'Authentication layer with AWS Cognito, session management, and route protection',
    keywords: ['auth', 'authentication', 'cognito', 'security', 'session'],
    peerDependencies: {
      'nuxt': '^4.0.0',
      [`${ORG_NAME}/amplify-layer`]: '0.1.0'
    }
  },
  billing: {
    description: 'Stripe billing integration with subscriptions, customer portal, and webhooks',
    keywords: ['billing', 'stripe', 'subscriptions', 'payments', 'webhooks'],
    peerDependencies: {
      'nuxt': '^4.0.0',
      [`${ORG_NAME}/amplify-layer`]: '0.1.0',
      [`${ORG_NAME}/auth-layer`]: '0.1.0',
      'stripe': '^14.0.0'
    }
  },
  workspaces: {
    description: 'Multi-tenant workspace management with team collaboration and invitations',
    keywords: ['workspaces', 'multi-tenancy', 'teams', 'collaboration', 'invitations'],
    peerDependencies: {
      'nuxt': '^4.0.0',
      [`${ORG_NAME}/amplify-layer`]: '0.1.0',
      [`${ORG_NAME}/auth-layer`]: '0.1.0'
    }
  },
  entitlements: {
    description: 'Authorization and RBAC system with role-based access control and feature gating',
    keywords: ['authorization', 'rbac', 'permissions', 'access-control', 'roles'],
    peerDependencies: {
      'nuxt': '^4.0.0',
      [`${ORG_NAME}/amplify-layer`]: '0.1.0',
      [`${ORG_NAME}/auth-layer`]: '0.1.0'
    }
  },
  saas: {
    description: 'Complete SaaS meta-layer with dashboard shell, navigation system, and pre-built pages',
    keywords: ['saas', 'dashboard', 'meta-layer', 'complete-app', 'navigation'],
    peerDependencies: {
      'nuxt': '^4.0.0',
      [`${ORG_NAME}/amplify-layer`]: '0.1.0',
      [`${ORG_NAME}/uix-layer`]: '0.1.0',
      [`${ORG_NAME}/i18n-layer`]: '0.1.0',
      [`${ORG_NAME}/auth-layer`]: '0.1.0',
      [`${ORG_NAME}/billing-layer`]: '0.1.0',
      [`${ORG_NAME}/workspaces-layer`]: '0.1.0',
      [`${ORG_NAME}/entitlements-layer`]: '0.1.0'
    }
  },
  debug: {
    description: 'Development debugging tools and utilities for local development',
    keywords: ['debug', 'development', 'devtools', 'utilities'],
    peerDependencies: {
      'nuxt': '^4.0.0'
    }
  }
}

console.log('🚀 Generating package.json files for all layers...\n')

Object.entries(layers).forEach(([name, config]) => {
  const packageJson = {
    name: `${ORG_NAME}/${name}-layer`,
    version: '0.1.0',
    description: config.description,
    type: 'module',
    main: './nuxt.config.ts',
    exports: {
      '.': './nuxt.config.ts',
      './composables/*': './composables/*',
      './components/*': './components/*',
      './utils/*': './utils/*',
      './config/*': './config/*',
      './types/*': './types/*'
    },
    files: [
      'app.config.ts',
      'nuxt.config.ts',
      'composables',
      'components',
      'layouts',
      'pages',
      'middleware',
      'plugins',
      'server',
      'utils',
      'config',
      'types',
      'assets',
      'public',
      'README.md'
    ],
    keywords: ['nuxt', 'nuxt-layer', 'nuxt4', 'saas', ...config.keywords],
    author: 'MMShark',
    license: 'MIT',
    repository: {
      type: 'git',
      url: `git+${REPO_URL}.git`,
      directory: `layers/${name}`
    },
    bugs: {
      url: `${REPO_URL}/issues`
    },
    homepage: `${REPO_URL}/tree/master/layers/${name}#readme`,
    publishConfig: {
      registry: 'https://npm.pkg.github.com',
      access: 'restricted'
    },
    peerDependencies: config.peerDependencies
  }

  const filePath = resolve(`layers/${name}/package.json`)

  try {
    writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n')
    console.log(`✅ Generated package.json for ${name}`)
    console.log(`   Package: ${packageJson.name}`)
    console.log(`   Version: ${packageJson.version}`)
    console.log(`   Description: ${packageJson.description}`)
    console.log('')
  } catch (error) {
    console.error(`❌ Failed to generate package.json for ${name}:`, error.message)
  }
})

console.log('✨ All package.json files generated successfully!')
console.log('\n📝 Next steps:')
console.log('   1. Review generated package.json files in each layer')
console.log('   2. Run: ./scripts/verify-layers.sh')
console.log('   3. Commit changes: git add layers/*/package.json')
console.log('   4. Configure GitHub token and publish')
