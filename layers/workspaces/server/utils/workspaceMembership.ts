import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import type { H3Event, EventHandlerRequest } from 'h3'
import {
  getAwsCredentials,
  amplifyRegion,
  amplifyOutputs
} from '@mmshark/amplify-layer/server/utils/amplify'

/**
 * Client for the `workspace-membership` Amplify function
 * (`apps/backend/amplify/functions/workspace-membership/`).
 *
 * Workspace lifecycle operations (create workspace, accept/decline
 * invitation, role change, member removal, workspace deletion) require two
 * privileges the Nitro server deliberately does NOT hold:
 *
 *  1. Cognito group management (`ws:<id>:members` / `ws:<id>:admins`), and
 *  2. tenant-record writes that the acting user's CURRENT token cannot yet
 *     authorize (Cognito only embeds group membership at token issue time).
 *
 * So the routes delegate to the Lambda, invoking it with the SIGNED-IN
 * user's Identity Pool authenticated-role credentials (the only principal
 * granted `lambda:InvokeFunction` on it — see `backend.ts`). The caller's
 * Cognito ACCESS TOKEN is forwarded in the payload; the Lambda verifies it
 * (GetUser) and re-checks all OWNER/ADMIN rules itself, so this is not a
 * confused-deputy: invoking the function directly grants nothing beyond
 * what these routes expose.
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
 * Extract the caller's Cognito access token from the session the workspaces
 * auth middleware attached to the event context.
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
