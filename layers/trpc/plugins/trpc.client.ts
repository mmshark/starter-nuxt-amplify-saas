import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client';

/**
 * tRPC Nuxt client plugin
 *
 * This plugin creates a tRPC client that's available throughout your Nuxt app.
 * The AppRouter type is inferred from the app that extends this layer.
 *
 * Usage in components:
 * ```vue
 * <script setup>
 * const { $trpc } = useNuxtApp()
 *
 * // Query example
 * const { data } = await $trpc.example.hello.useQuery({ text: 'World' })
 *
 * // Mutation example
 * const createMutation = $trpc.workspaces.create.useMutation()
 * await createMutation.mutate({ name: 'My Workspace' })
 * </script>
 * ```
 */
export default defineNuxtPlugin(() => {
  console.log('🔌 [tRPC Layer] Initializing tRPC client...')

  /**
   * Create tRPC client without explicit type parameter.
   * The type will be inferred from the AppRouter defined in the extending app's
   * server/trpc/routers/index.ts
   */
  const trpc = createTRPCNuxtClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        // Include credentials (cookies) for authentication
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'same-origin',
          })
        },
      }),
    ],
  })

  console.log('✅ [tRPC Layer] tRPC client created successfully')

  return {
    provide: {
      trpc,
    },
  }
})
