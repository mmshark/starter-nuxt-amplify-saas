import type { NuxtApp } from 'nuxt/app'
import type { Client as DataClient } from 'aws-amplify/data'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/amplify/data/resource'

declare module 'nuxt/app' {
  interface NuxtApp {
    $Amplify: {
      Auth: typeof import('aws-amplify/auth')
      Data: { client: DataClient<Schema> }
      Storage: {
        uploadData: typeof import('aws-amplify/storage').uploadData
        getUrl: typeof import('aws-amplify/storage').getUrl
      }
    }
  }
}
