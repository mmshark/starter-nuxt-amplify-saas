# Pattern: tRPC Integration

> [!CAUTION]
> **DEPRECATED**: This pattern has been replaced with classic Nuxt `server/api` endpoints. See [API Server Pattern](api-server.pattern.md) for the current standard.
>
> **Rationale**: The project has moved to using Nuxt's built-in server/api routing for simplicity, better alignment with Nuxt conventions, and reduced complexity. REST API endpoints with Zod validation provide sufficient type safety for this project's needs.

## Context (Historical Reference)
REST APIs often suffer from lack of type safety between client and server, leading to runtime errors and poor developer experience.

## Problem
- **Type Disconnect**: Frontend doesn't know the exact shape of backend responses.
- **Boilerplate**: Manually typing fetch responses.
- **Refactoring Pain**: Changing backend types breaks frontend silently.

## Solution
Use **tRPC** for end-to-end type safety. It allows the frontend to call backend functions directly as if they were local, with full type inference.

## Pattern Details

### Structure
- **Routers**: Defined in `layers/<layer>/server/trpc/routers/`.
- **Procedures**:
    - `publicProcedure`: Open access.
    - `protectedProcedure`: Requires authentication.

### Example Router
```typescript
import { z } from 'zod'
import { publicProcedure, router } from '../../trpc'

export const exampleRouter = router({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      }
    }),
})
```

### Client Usage
```typescript
const { $client } = useNuxtApp()
const result = await $client.example.hello.query({ text: 'World' })
// result.greeting is typed as string
```
