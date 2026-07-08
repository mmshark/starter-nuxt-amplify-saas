# E04 Plan — Transactional email & invitations end-to-end

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new

Implementation plan for [spec.md](./spec.md), following the decisions in [design.md](./design.md)
(SES behind a provider-agnostic util in `layers/amplify`, send from the Nitro route, branded Cognito
emails via `defineAuth`). Phases are ordered by dependency; each ends with a concrete verification.
API-route work follows [patterns/api-server.md](../../patterns/api-server.md) and
[patterns/error-handling.md](../../patterns/error-handling.md).

## Phase 1 — Email infrastructure (adapter + SES setup)

| File | Change |
|---|---|
| `layers/amplify/server/utils/email.ts` | **New.** `SendEmailInput`, `EmailProvider` interface, `SesEmailProvider` (SESv2 `SendEmailCommand`, default SDK credential chain), `getEmailProvider()` factory reading `runtimeConfig.email`. Pure module — no h3/Nuxt imports beyond `useRuntimeConfig`. |
| `layers/amplify/package.json` | Add `@aws-sdk/client-sesv2` to `dependencies` (next to the existing `@aws-sdk/client-lambda`). |
| `layers/amplify/nuxt.config.ts` | Add server-only `runtimeConfig.email = { provider: 'ses', from: process.env.EMAIL_FROM || '' }`. |
| `.context/operations/email.md` | **New.** Ops runbook: verify SES identity (domain via Easy DKIM, or single address for dev), sandbox limits + production-access request, `EMAIL_FROM`, local-dev credentials, Amplify Hosting compute role with `ses:SendEmail` (confirm exact wiring here — open point from design.md D4), Cognito `senders.email` prerequisite (identity must be verified in the user pool's region). |

Notes:
- `getEmailProvider()` throws a clear 500-style error if `email.from` is unset — no silent no-op sender.
- Do NOT touch `getAwsCredentials()` / identity-pool roles (design.md D4).

**Verification**: unit test for the factory/config errors; manual script or dev-only route sends a
test mail to a verified address from `pnpm dev` using local AWS creds.

## Phase 2 — Send the invitation email

| File | Change |
|---|---|
| `apps/backend/amplify/functions/workspace-membership/handler.ts` | `createInvitation` returns `{ id, token, expiresAt, success }` (drop the untrue `'Invitation sent successfully'` message, line 554). Exposure parity argument: `invitations.get.ts:66` already returns tokens to the same OWNER/ADMIN audience. |
| `layers/workspaces/server/utils/invitationEmail.ts` | **New.** `renderInvitationEmail({ workspaceName, inviterName, inviterEmail, role, message, expiresAt, acceptUrl })` → `{ subject, html, text }`. Hand-written HTML + text (no template framework in v1). |
| `layers/workspaces/server/api/workspaces/[id]/members/invite.post.ts` | After the Lambda returns: build `acceptUrl` from `runtimeConfig.public.appBaseUrl` (already defined in `layers/billing/nuxt.config.ts:14`; move/duplicate the key so it doesn't depend on the billing layer — decide at implementation, note in tech-debt if duplicated) + `workspaceId`/`invitationId`/`token`; fetch workspace name (existing data-client pattern); `getEmailProvider().send(...)` in try/catch → respond `{ id, success: true, emailSent: boolean }`. Email failure logs the error, never rolls back the invitation. |
| `layers/workspaces/components/InviteWorkspaceMemberModal.vue` | Toast honesty (line 81): `emailSent: true` → "Invitation sent to {email}"; `false` → warning "Invitation created, but the email could not be sent — copy the invite link from Pending Invitations". |
| `layers/workspaces/types/workspaces.ts` | Extend invite result type with `emailSent`. |

**Verification**: from the running app, invite an SES-verified address → email arrives with a link
containing all three query params; kill `EMAIL_FROM` → invitation still created, warning toast shown.

## Phase 3 — `/invitations/accept` page

| File | Change |
|---|---|
| `layers/workspaces/pages/invitations/accept.vue` | **New page** (first `pages/` dir in this layer — same mechanism as `layers/debug/pages/`). No `auth` middleware (page handles both auth states). Reads/validates `workspaceId`, `invitationId`, `token` from query. Signed-out: CTAs to `/auth/login` + `/auth/signup` with `redirect=` current full path (both honor it — `layers/saas/pages/auth/{login,signup}.vue:19-20`). Signed-in: Accept / Decline buttons; distinct states for expired / declined / accepted / not-found / already-member / **email mismatch** (403 message from Lambda surfaced with "sign out & use the invited address" guidance). |
| `layers/workspaces/composables/useWorkspaceMembership.ts` | Add `acceptInvitation(workspaceId, invitationId, token)` and `declineInvitation(...)` → `$fetch POST` to the existing endpoints (`.../accept`, `.../decline` with `{ token }` body — `readInvitationToken` already accepts body or query). |
| `layers/auth/composables/useUser.ts` | Add `refreshSession()` → `fetchAuthSession({ forceRefresh: true })` + re-fetch user. Needed because new `ws:<id>:*` groups only appear in refreshed tokens (see the NOTE in `accept.post.ts`). |
| Accept success path | `refreshSession()` → set current workspace via `useWorkspaces()` (writes the `current-workspace-id` cookie) → `navigateTo('/')`. Heads-up: E02 owns the `current-workspace-id` vs `currentWorkspaceId` cookie-name mismatch fix; this page must use whatever E02 lands on. |

**Verification**: manual two-account walkthrough — signed-out accept (via signup and via login),
signed-in accept, wrong-email 403, expired token (flip `expiresAt` in DynamoDB), revoked link,
double-accept. Each renders its dedicated state.

## Phase 4 — Revoke + copy-link UI

| File | Change |
|---|---|
| `layers/workspaces/composables/useWorkspaceMembers.ts` | Add `revokeInvitation(invitationId)` → `POST /api/workspaces/{id}/invitations/{invitationId}/decline` (no token — Lambda's OWNER/ADMIN path, `handler.ts:685-694`), then `refreshInvitations()`. |
| `layers/saas/pages/settings/members.vue` | Pending Invitations block (lines 67-89): add per-row **Revoke** (with confirm) and **Copy invite link** (clipboard; URL built from `appBaseUrl` + the `token`/ids already present on the `WorkspaceInvitation` objects returned by `invitations.get.ts`). Toast feedback for both. |

**Verification**: revoke a pending invite → row disappears, emailed link now shows the
"already declined" state; copy link in a private window → full accept flow works without any email.

## Phase 5 — Branded Cognito emails

| File | Change |
|---|---|
| `apps/backend/amplify/auth/resource.ts` | Extend `defineAuth`: `loginWith.email` becomes an object with `verificationEmailStyle: 'CODE'` (**must stay CODE** — `Authenticator.vue` UI and the e2e 6-digit `extractCode` depend on it), branded `verificationEmailSubject` and `verificationEmailBody(createCode)`; add `senders: { email: { fromEmail, fromName } }` pointing at the SES-verified identity from Phase 1. |
| `.context/operations/email.md` | Add the Cognito section: region constraint, sandbox implications for sign-up emails, rollback (remove `senders` to fall back to Cognito default). |
| Optional (should-have, only if distinct per-message content is required) | `apps/backend/amplify/auth/custom-message/{resource,handler}.ts` — `CustomMessage` trigger branching on `triggerSource` (SignUp vs ForgotPassword), registered in `auth/resource.ts` `triggers`. Skip unless product asks for it. |

**Verification**: deploy to sandbox; sign up a fresh user → verification email arrives from
`fromEmail` with branded subject and a 6-digit code; run
`apps/saas/tests/e2e/specs/layers/auth` signup spec — `verifyEmail` passes unchanged; password
reset email also arrives from the custom sender.

## Phase 6 — E2E: invitation flow spec

Reuses the existing real-inbox infrastructure: `node-imap` Gmail helper with plus-addressed
recipients (`test+<alias>@ontopix.ai` all land in the `GMAIL_USER` inbox —
`apps/saas/tests/e2e/helpers/auth.js:30-44`, search by `TO` header + `SINCE` at `:47-55`).

| File | Change |
|---|---|
| `apps/saas/tests/e2e/helpers/auth.js` | Add `getInvitationLink(emailAddress, timeoutMs)` alongside `getVerificationCode` (`:92-115`): same connect/search/fetch loop, but extract the first URL matching `/invitations\/accept\?[^"'\s<]+/` from html/text, returning the full link. |
| `apps/saas/tests/e2e/specs/flows/workspace-invitation.spec.js` | **New spec**: (1) sign in as fixture owner (`test+free1@ontopix.ai`, `fixtures/users.json`); (2) Settings → Members → invite a unique alias `test+inv<ts>@ontopix.ai` as MEMBER; (3) `getInvitationLink()` for that alias; (4) fresh browser context: open the link signed-out → Create account → existing signup + `verifyEmail` helpers → returned to accept page → Accept; (5) assert landing in the app with the invited workspace active; (6) owner context: member listed, pending invitation gone. Second test: invite → **Revoke** from UI → opening the emailed link shows the declined/invalid state. |
| `apps/saas/tests/e2e/fixtures/users.json` | Only if a dedicated stable invitee is preferred over generated aliases (generated alias is the default — avoids fixture state coupling). |

Environment prerequisites (document in the spec file header + ops runbook): backend deployed with
Phases 1-5, `EMAIL_FROM` verified, and — while in SES sandbox — the `ontopix.ai` domain verified so
`test+*` recipients are deliverable.

**Verification**: `pnpm --filter @starter-nuxt-amplify-saas/saas test:e2e -- workspace-invitation`
green against the sandbox; auth + billing specs still green.

## Sequencing & dependencies

```
P1 (adapter + SES setup)
 ├─→ P2 (invitation send)  ─→ P3 (accept page) ─→ P6 (e2e)
 │                          └─→ P4 (revoke/copy-link, parallel with P3)
 └─→ P5 (Cognito branding, parallel with P2-P4)
```

- **E01 (green-ci)** gates the "done" claim (criteria 10) — the e2e must be runnable in CI or, until
  then, documented as sandbox-run.
- **E02 (fix-broken-wiring)** owns the workspace-cookie mismatch the accept page touches (Phase 3 note).
- **E08 (workspace-lifecycle)** consumes this epic's output (invitee-side invitation views) — keep its
  scope out (spec "Out of scope").

## Risk register

| Risk | Mitigation |
|---|---|
| SES sandbox blocks arbitrary recipients on fresh AWS accounts | Copy-link fallback (P4) keeps the flow usable; runbook makes production access a first-class setup step; domain verification covers the e2e inbox |
| Amplify Hosting compute-role wiring differs from assumption | Confirm in P1 before P2 lands; fallback: static SES credentials via env (documented, flagged in tech-debt) |
| `appBaseUrl` currently lives in the billing layer's runtimeConfig | Resolve ownership in P2 (promote to a shared layer config or duplicate deliberately); record in `architecture/tech-debt.md` if duplicated |
| Token-bearing URLs in logs/referrers | Don't log full accept-page URLs; token is useless without a session on the invited email (Lambda email-match, `handler.ts:576-578`) + 7-day expiry |
| Cognito branding accidentally switches to LINK style and breaks e2e | Explicit requirement to keep `verificationEmailStyle: 'CODE'` (P5) + auth e2e spec in the phase verification |
| Email delivery flakiness in e2e | Reuse the proven poll-with-timeout pattern (`getVerificationCode`); unique per-run aliases prevent stale-mail matches (`SINCE` filter already applied) |
