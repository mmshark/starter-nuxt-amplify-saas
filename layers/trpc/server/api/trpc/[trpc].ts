import { createContext } from '@starter-nuxt-amplify-saas/trpc/server/trpc/context'
import { createNuxtApiHandler } from 'trpc-nuxt'
import { appRouter } from '../../trpc/app-router'

export default createNuxtApiHandler({
  router: appRouter,
  createContext,
})
