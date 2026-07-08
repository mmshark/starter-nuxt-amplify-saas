import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { createError, getQuery, readBody } from 'h3'
import type { H3Event, EventHandlerRequest } from 'h3'
import { getAwsCredentials, amplifyRegion, amplifyOutputs } from './amplify'

/**
 * Client for the `workspace-membership` Amplify function
 * (`apps/backend/amplify/functions/workspace-membership/`).
 *
 * ALL writes to the tenant tables (Workspace, WorkspaceMember,
 * WorkspaceInvitation, WorkspaceSubscription) go through this function —
 * client principals (userPool/identityPool) hold READ-ONLY grants on them
 * (see `apps/backend/amplify/data/resource.ts`). On top of the data-access
 * question, workspace lifecycle also needs Cognito group management
 * (`ws:<id>:members` / `ws:<id>:admins`), admin permissions the Nitro server
 * deliberately does NOT hold.
 *
 * The routes invoke the Lambda with the SIGNED-IN user's Identity Pool
 * authenticated-role credentials (the only principal granted
 * `lambda:InvokeFunction` on it — see `backend.ts`). The caller's Cognito
 * ACCESS TOKEN is forwarded in the payload; the Lambda verifies it (GetUser)
 * and re-checks all OWNER/ADMIN rules itself, so this is not a
 * confused-deputy: invoking the function directly grants nothing beyond
 * what these routes expose.
 *
 * Lives in the amplify layer so both the workspaces layer (workspace CRUD,
 * invitations, membership) and the billing layer (subscription bootstrap)
 * can share it without a dependency cycle.
 */

interface MembershipSuccess<T> {
  ok: true
  data: T
}

interface MembershipFailure {
  ok: false
  statusCode: number
  message: string
}

/**
 * Extract the caller's Cognito access token from the session that auth
 * middleware attached to the event context.
 */
export function getSessionAccessToken(event: H3Event<EventHandlerRequest>): string {
  const accessToken = event.context.session?.tokens?.accessToken?.toString()
  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'No access token available for this session'
    })
  }
  return accessToken
}

/**
 * Read an invitation `token` from either the query string (an emailed
 * `?token=...` link) or a JSON body (`{ token }`), whichever the caller
 * used. Returns `undefined` if neither supplies one — callers decide
 * whether that's fatal (accept always requires it; decline only requires it
 * for the invitee, not for an OWNER/ADMIN revoking on someone else's behalf).
 */
export async function readInvitationToken(event: H3Event<EventHandlerRequest>): Promise<string | undefined> {
  const query = getQuery(event)
  if (typeof query.token === 'string' && query.token.length > 0) {
    return query.token
  }
  try {
    const body = await readBody<Record<string, unknown> | undefined>(event)
    if (body && typeof body.token === 'string' && body.token.length > 0) {
      return body.token
    }
  } catch {
    // No body, or not JSON — fine, there's simply no body-supplied token.
  }
  return undefined
}

/**
 * Invoke a workspace-membership action. Must run inside `withAmplifyAuth`
 * (the `contextSpec` is used to resolve the signed-in user's authenticated
 * Identity Pool credentials for the Lambda invoke).
 */
export async function invokeWorkspaceMembership<T>(
  contextSpec: unknown,
  accessToken: string,
  payload: Record<string, unknown>
): Promise<T> {
  const functionName = amplifyOutputs.custom?.workspaceMembershipFunctionName
  if (!functionName) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message:
        'amplify_outputs.json has no custom.workspaceMembershipFunctionName. Redeploy the backend ' +
        '(the output is added in apps/backend/amplify/backend.ts).'
    })
  }

  const credentials = await getAwsCredentials(contextSpec)
  const lambda = new LambdaClient({ region: amplifyRegion, credentials })

  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify({ ...payload, accessToken }))
    })
  )

  if (response.FunctionError || !response.Payload) {
    const errorPayload = response.Payload ? Buffer.from(response.Payload).toString('utf-8') : ''
    console.error(`workspace-membership returned ${response.FunctionError}: ${errorPayload}`)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Workspace membership operation failed'
    })
  }

  const result = JSON.parse(Buffer.from(response.Payload).toString('utf-8')) as
    | MembershipSuccess<T>
    | MembershipFailure

  if (!result.ok) {
    throw createError({
      statusCode: result.statusCode,
      message: result.message
    })
  }

  return result.data
}
