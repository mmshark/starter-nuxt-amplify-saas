```typescript
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { getServerUserPoolDataClient, getServerPublicDataClient } from '../../../../amplify/server/utils/amplify'
import { publicProcedure, protectedProcedure, router } from '../../../../trpc/server/trpc/trpc'

export const workspacesRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Use Public client to bypass owner checks if needed, or UserPool if strict
      // For listing "my" workspaces, UserPool is fine IF we have the right rules.
      // But WorkspaceMember only allows 'read' for 'userId'.
      // Let's use Public client for reliability in this complex relation query
      const client = getServerPublicDataClient()
      const userId = ctx.user.userId

      // 1. Get memberships
      const { data: memberships } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: { userId: { eq: userId } }
      })

      // 2. Get workspaces details
      const workspacePromises = memberships.map(async (m) => {
        const { data: workspace } = await m.workspace()
        return workspace
      })

      const workspaces = await Promise.all(workspacePromises)
      // Filter out nulls (deleted workspaces) and sort by createdAt desc
      return workspaces
        .filter((w): w is NonNullable<typeof w> => w !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1).optional(),
      description: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const client = getServerPublicDataClient() // Use privileged client
      const userId = ctx.user.userId
      const userEmail = ctx.user.signInDetails?.loginId || ctx.user.username

      // Generate slug if not provided
      const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36)

      // Create Workspace
      const { data: workspace, errors } = await client.models.Workspace.create(ctx.contextSpec, {
        name: input.name,
        slug,
        description: input.description,
        ownerId: userId,
        isPersonal: false,
        memberCount: 1
      })

      if (errors || !workspace) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create workspace',
          cause: errors
        })
      }

      // Create Member (Owner)
      await client.models.WorkspaceMember.create(ctx.contextSpec, {
        workspaceId: workspace.id,
        userId: userId,
        email: userEmail,
        role: 'OWNER',
        joinedAt: new Date().toISOString()
      })

      return workspace
    }),

  listMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = getServerPublicDataClient()

      // Verify membership first (security check)
      const { data: membership } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: {
          workspaceId: { eq: input.workspaceId },
          userId: { eq: ctx.user.userId }
        }
      })

      if (membership.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this workspace' })
      }

      const { data: members } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: { workspaceId: { eq: input.workspaceId } }
      })

      return members
    }),

  inviteMember: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      email: z.string().email(),
      role: z.enum(['ADMIN', 'MEMBER']),
      message: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const client = getServerPublicDataClient()

      // Verify ownership/admin rights
      const { data: membership } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: {
          workspaceId: { eq: input.workspaceId },
          userId: { eq: ctx.user.userId }
        }
      })

      const currentUserRole = membership[0]?.role
      if (!currentUserRole || (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
      }

      // Check if already member
      const { data: existingMember } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: {
          workspaceId: { eq: input.workspaceId },
          email: { eq: input.email }
        }
      })

      if (existingMember.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'User is already a member' })
      }

      // Create Invitation
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36) // Simple token for now
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

      const { data: invitation } = await client.models.WorkspaceInvitation.create(ctx.contextSpec, {
        workspaceId: input.workspaceId,
        email: input.email,
        role: input.role,
        invitedBy: ctx.user.userId,
        inviterName: ctx.user.signInDetails?.loginId, // Or fetch profile name
        token,
        expiresAt,
        message: input.message
      })

      // TODO: Send email (Notifications Layer)

      return invitation
    }),

  listInvitations: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = getServerPublicDataClient()

      // Verify membership
      const { data: membership } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: {
          workspaceId: { eq: input.workspaceId },
          userId: { eq: ctx.user.userId }
        }
      })

      if (membership.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this workspace' })
      }

      const { data: invitations } = await client.models.WorkspaceInvitation.list(ctx.contextSpec, {
        filter: { workspaceId: { eq: input.workspaceId } }
      })

      return invitations
    }),

  removeMember: protectedProcedure
    .input(z.object({ workspaceId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const client = getServerPublicDataClient()

      // Verify ownership
      const { data: membership } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: {
          workspaceId: { eq: input.workspaceId },
          userId: { eq: ctx.user.userId }
        }
      })

      if (membership[0]?.role !== 'OWNER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners can remove members' })
      }

      // Find member to remove
      const { data: targetMember } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: {
          workspaceId: { eq: input.workspaceId },
          userId: { eq: input.userId }
        }
      })

      if (targetMember.length > 0) {
        await client.models.WorkspaceMember.delete(ctx.contextSpec, { id: targetMember[0].id })
      }

      return { success: true }
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      userId: z.string(),
      role: z.enum(['ADMIN', 'MEMBER']) // Cannot promote to OWNER via this simple method yet
    }))
    .mutation(async ({ ctx, input }) => {
      const client = getServerPublicDataClient()

      // Verify ownership
      const { data: membership } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: {
          workspaceId: { eq: input.workspaceId },
          userId: { eq: ctx.user.userId }
        }
      })

      if (membership[0]?.role !== 'OWNER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners can update roles' })
      }

      // Find member
      const { data: targetMember } = await client.models.WorkspaceMember.list(ctx.contextSpec, {
        filter: {
          workspaceId: { eq: input.workspaceId },
          userId: { eq: input.userId }
        }
      })

      if (targetMember.length > 0) {
        await client.models.WorkspaceMember.update(ctx.contextSpec, {
          id: targetMember[0].id,
          role: input.role
        })
      }

      return { success: true }
    })
})
```
