import { Amplify } from 'aws-amplify'
import * as Auth from 'aws-amplify/auth'
import { uploadData, getUrl } from 'aws-amplify/storage'
import { generateClient } from 'aws-amplify/data'
import outputs from '../amplify_outputs.json'
import type { Schema } from '@starter-nuxt-amplify-saas/backend/schema'

export default defineNuxtPlugin({
  name: 'amplify.client',
  enforce: 'pre',
  setup() {
    Amplify.configure(outputs, { ssr: true })

    const dataClient = generateClient<Schema>({
      config: outputs,
      authMode: 'userPool'
    })

    return {
      provide: {
        Amplify: {
          Auth,
          Data: { client: dataClient },
          Storage: { uploadData, getUrl }
        }
      }
    }
  }
})
