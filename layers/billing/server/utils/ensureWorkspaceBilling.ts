import type Stripe from 'stripe'
import { workspaceGroupFields } from '@mmshark/amplify-layer/server/utils/workspaceGroups'

/**
 * ensureWorkspaceBilling
 *
 * Guarantees a WORKSPACE (not a user) has exactly one Stripe customer and a
 * `WorkspaceSubscription` row. Billing is workspace-scoped: a workspace's
 * Stripe customer id lives on `WorkspaceSubscription.stripeCustomerId`, never
 * on `UserProfile`.
 *
 * PRIVILEGED-LAMBDA ONLY: tenant tables are READ-ONLY for client principals
 * (see apps/backend/amplify/data/resource.ts), so the WorkspaceSubscription
 * write below only succeeds for functions holding an `allow.resource(...)`
 * grant. Callers today: the `post-confirmation` trigger and the
 * `workspace-membership` function (createWorkspace + ensureBilling actions).
 * Nitro routes must NOT call this with a userPool client — they go through
 * the workspace-membership Lambda's `ensureBilling` action instead.
 *
 * The `contextSpec` parameter remains for Amplify Data server clients whose
 * model methods take `(contextSpec, input)`; Lambda clients omit it.
 *
 * Idempotency:
 *  - DB-first: if a `WorkspaceSubscription` already exists for the workspace,
 *    its `stripeCustomerId` is reused and no Stripe API call is made.
 *  - Stripe-side: the customer creation call is passed
 *    `idempotencyKey: workspaceId`, so even a retried call that races past the
 *    DB check cannot create a second Stripe customer for the same workspace
 *    (fixes the retry-duplicates-customer bug).
 */
export interface EnsureWorkspaceBillingParams {
  workspaceId: string
  stripe: Stripe
  /** Any Amplify Data client exposing `models.WorkspaceSubscription`. */
  client: any
  /** Amplify SSR contextSpec; omit when calling from a Lambda function. */
  contextSpec?: any
  customerEmail?: string | null
  customerName?: string | null
}

export interface EnsureWorkspaceBillingResult {
  stripeCustomerId: string
  created: boolean
}

export async function ensureWorkspaceBilling(
  params: EnsureWorkspaceBillingParams
): Promise<EnsureWorkspaceBillingResult> {
  const { workspaceId, stripe, client, contextSpec, customerEmail, customerName } = params

  const call = <T>(op: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> =>
    contextSpec ? op(contextSpec, ...args) : op(...args)

  const { data: existing } = await call(client.models.WorkspaceSubscription.get, { workspaceId })

  if (existing?.stripeCustomerId) {
    return { stripeCustomerId: existing.stripeCustomerId, created: false }
  }

  const customer = await stripe.customers.create(
    {
      email: customerEmail || undefined,
      name: customerName || undefined,
      metadata: { workspaceId },
    },
    { idempotencyKey: workspaceId }
  )

  const { errors } = await call(client.models.WorkspaceSubscription.create, {
    workspaceId,
    planId: 'free',
    stripeSubscriptionId: null,
    stripeCustomerId: customer.id,
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    billingInterval: null,
    trialStart: null,
    trialEnd: null,
    // Group-per-workspace authorization (see apps/backend/amplify/data/resource.ts):
    // members read the subscription, admins manage it.
    ...workspaceGroupFields(workspaceId),
  })

  if (errors) {
    // Rollback: don't leave an orphaned Stripe customer behind when the
    // WorkspaceSubscription row could not be written. (The idempotency key
    // above refers to the CREATE call, so a later retry after this delete
    // creates a fresh customer.)
    try {
      await stripe.customers.del(customer.id)
    } catch (cleanupError) {
      console.error(
        `Failed to delete orphaned Stripe customer ${customer.id} for workspace ${workspaceId}:`,
        cleanupError
      )
    }

    throw new Error(
      `Failed to create WorkspaceSubscription for workspace ${workspaceId}: ${JSON.stringify(errors)}`
    )
  }

  return { stripeCustomerId: customer.id, created: true }
}
