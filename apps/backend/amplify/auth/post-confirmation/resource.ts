import { defineFunction } from '@aws-amplify/backend'

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  environment: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || ''
  }
})
