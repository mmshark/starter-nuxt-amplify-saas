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
 * Callable from two different runtimes with two different Amplify Data
 * client shapes:
 *  - Nitro server routes: `generateClient<Schema>({ authMode: 'iam' })` from
 *    `aws-amplify/data/server`, whose model methods take `(contextSpec, input)`.
 *  - The `post-confirmation` and `stripe-webhook` Lambda functions:
 *    `generateClient<Schema>()` from `aws-amplify/data`, whose model methods
 *    take `(input)` only.
 *
 * Pass `contextSpec` when calling from a Nitro route (inside `withAmplifyAuth`
 * / `withAmplifyPublic`); omit it when calling from a Lambda function.
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
