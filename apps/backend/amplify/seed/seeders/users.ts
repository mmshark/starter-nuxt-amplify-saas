import * as auth from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import { createAndSignUpUser, signInUser, addToUserGroup } from '@aws-amplify/seed'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import type { Schema } from '../../data/resource'
import { loadAmplifyOutputs } from '../utils/amplify'
import { ensureStripeSecret, createStripeClient } from '../utils/stripe'

export type SeedUser = {
  username: string
  password: string
  attributes?: Record<string, string>
  groups?: string[]
  planId?: string
  billingInterval?: 'month' | 'year'
  paymentMethod?: {
    type: 'card'
    card: {
      number: string
      exp_month: number
      exp_year: number
      cvc: string
    }
  }
}

export type SeedUsersFile = { users: SeedUser[] }

type DataClient = ReturnType<typeof generateClient<Schema>>

const POLL_ATTEMPTS = 15
const POLL_DELAY_MS = 1_000

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

async function findPersonalWorkspace(client: DataClient, slug: string) {
  const { data, errors } = await client.models.Workspace.list({
    filter: { slug: { eq: slug } }
  })
  if (errors) throw new Error(`Failed to look up personal workspace: ${JSON.stringify(errors)}`)
  return data?.[0] ?? null
}

async function pollForPersonalWorkspace(client: DataClient, slug: string) {
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
    const workspace = await findPersonalWorkspace(client, slug)
    if (workspace) return workspace
    if (attempt < POLL_ATTEMPTS) await delay(POLL_DELAY_MS)
  }
  return null
}

/**
 * `@aws-amplify/seed` creates users through AdminCreateUser and completes the
 * new-password challenge. Cognito does not run PostConfirmation for that
 * administrative flow, so invoke the real trigger Lambda explicitly instead
 * of reimplementing privileged tenant writes in the seeder.
 */
async function provisionUserWithPostConfirmation(user: SeedUser): Promise<void> {
  const outputs = await loadAmplifyOutputs()
  const functionName = outputs.custom?.postConfirmationFunctionName
  const userPoolId = outputs.auth?.user_pool_id
  const region = outputs.auth?.aws_region
  if (!functionName || !userPoolId || !region) {
    throw new Error('Amplify outputs lack postConfirmationFunctionName/user pool configuration')
  }

  const session = await auth.fetchAuthSession()
  const payload = session.tokens?.accessToken?.payload
  const userId = typeof payload?.sub === 'string' ? payload.sub : undefined
  const cognitoUsername = typeof payload?.username === 'string' ? payload.username : user.username
  if (!userId) throw new Error(`No Cognito sub available after signing in ${user.username}`)

  const response = await new LambdaClient({ region }).send(new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({
      userPoolId,
      userName: cognitoUsername,
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: userId,
          email: user.username,
          given_name: user.attributes?.given_name ?? '',
          family_name: user.attributes?.family_name ?? ''
        }
      },
      response: {}
    }))
  }))

  if (response.FunctionError) {
    const details = response.Payload
      ? Buffer.from(response.Payload).toString('utf8')
      : response.FunctionError
    throw new Error(`Post-confirmation provisioning failed: ${details}`)
  }
}

async function ensurePersonalWorkspace(user: SeedUser) {
  const currentUser = await auth.getCurrentUser()
  const slug = `${currentUser.userId}-personal`

  await auth.fetchAuthSession({ forceRefresh: true })
  const client = generateClient<Schema>({ authMode: 'userPool' })
  const workspace = await findPersonalWorkspace(client, slug)

  if (workspace) return { client, workspace }

  console.log(`🔧 Provisioning personal workspace through post-confirmation for ${user.username}`)
  await provisionUserWithPostConfirmation(user)
  // Group membership is stamped into tokens, so refresh after provisioning.
  await auth.fetchAuthSession({ forceRefresh: true })
  const refreshedClient = generateClient<Schema>({ authMode: 'userPool' })
  const provisionedWorkspace = await pollForPersonalWorkspace(refreshedClient, slug)

  if (!provisionedWorkspace) {
    throw new Error(`Personal workspace provisioning did not converge for ${user.username}`)
  }

  return { client: refreshedClient, workspace: provisionedWorkspace }
}

async function ensurePaidSubscription(
  client: DataClient,
  workspaceId: string,
  user: SeedUser
): Promise<void> {
  const planId = user.planId ?? 'free'
  const { data: existing, errors: subscriptionErrors } =
    await client.models.WorkspaceSubscription.get({ workspaceId })
  if (subscriptionErrors || !existing) {
    throw new Error(`WorkspaceSubscription missing for ${workspaceId}: ${JSON.stringify(subscriptionErrors)}`)
  }

  if (planId === 'free') {
    if (existing.planId !== 'free' || existing.stripeSubscriptionId) {
      throw new Error(`Expected a free subscription for seeded user ${user.username}`)
    }
    return
  }

  if (existing.planId === planId && existing.stripeSubscriptionId) {
    console.log(`ℹ️  ${user.username} already has the seeded ${planId} subscription`)
    return
  }
  if (existing.stripeSubscriptionId) {
    throw new Error(`${user.username} already has a different Stripe subscription`)
  }

  const { data: plan, errors: planErrors } = await client.models.SubscriptionPlan.get({ planId })
  if (planErrors || !plan) {
    throw new Error(`Plan ${planId} is unavailable: ${JSON.stringify(planErrors)}`)
  }

  const priceId = user.billingInterval === 'year'
    ? plan.stripeYearlyPriceId
    : plan.stripeMonthlyPriceId
  if (!priceId) throw new Error(`Plan ${planId} has no ${user.billingInterval ?? 'month'} price`)

  const stripe = createStripeClient(await ensureStripeSecret())
  let paymentMethodId: string | undefined
  if (user.paymentMethod) {
    if (user.paymentMethod.card.number !== '4242424242424242') {
      throw new Error('Seeder only supports Stripe test card 4242 via tok_visa')
    }
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      // Stripe accounts normally reject raw PANs even in test mode. The
      // official test token exercises the same Visa-success path safely.
      card: { token: 'tok_visa' }
    })
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: existing.stripeCustomerId
    })
    await stripe.customers.update(existing.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethod.id }
    })
    paymentMethodId = paymentMethod.id
  }

  const stripeSubscription = await stripe.subscriptions.create({
    customer: existing.stripeCustomerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId,
    metadata: { workspaceId }
  })
  console.log(`✅ Created Stripe subscription ${stripeSubscription.id} for ${user.username}`)

  // The signed webhook is the only writer that may promote the local row.
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
    const { data } = await client.models.WorkspaceSubscription.get({ workspaceId })
    if (data?.planId === planId && data.stripeSubscriptionId === stripeSubscription.id) return
    if (attempt < POLL_ATTEMPTS) await delay(POLL_DELAY_MS)
  }
  throw new Error(`Stripe webhook did not sync ${planId} for ${user.username}`)
}

async function seedUser(user: SeedUser): Promise<void> {
  try {
    try {
      await createAndSignUpUser({
        username: user.username,
        password: user.password,
        signInFlow: 'Password',
        signInAfterCreation: true,
        userAttributes: {
          email: user.username,
          givenName: user.attributes?.given_name,
          familyName: user.attributes?.family_name
        }
      })
      console.log(`✅ Created user: ${user.username}`)
    } catch (error) {
      if (error instanceof Error && error.name === 'UsernameExistsError') {
        await signInUser({
          username: user.username,
          password: user.password,
          signInFlow: 'Password'
        })
        console.log(`✅ Signed in existing user: ${user.username}`)
      } else {
        throw error
      }
    }

    for (const group of user.groups ?? []) {
      await addToUserGroup({ username: user.username }, group)
    }

    const { client, workspace } = await ensurePersonalWorkspace(user)
    await ensurePaidSubscription(client, workspace.id, user)
  } finally {
    await auth.signOut().catch(() => undefined)
  }
}

export async function seedUsers(usersFile: SeedUsersFile): Promise<void> {
  console.log(`👥 Seeding ${usersFile.users.length} users...`)
  const failures: string[] = []

  for (const user of usersFile.users) {
    try {
      await seedUser(user)
      console.log(`✅ Seeded ${user.username}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${user.username}: ${message}`)
      console.error(`❌ Failed to seed ${user.username}: ${message}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`Failed to seed ${failures.length} user(s):\n${failures.join('\n')}`)
  }

  console.log(`✅ Users seeded successfully (${usersFile.users.length})`)
}
