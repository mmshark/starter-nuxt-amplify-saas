---
id: 20260708-transactional-email
title: E04 — Transactional email and invitations
type: feat
status: planned
created: 2026-07-08
roadmap: 20260711-saas-boilerplate-productization
phase: complete-core-loops
depends_on: []
related:
  - .context/prd/workspaces.md
delivery:
  type: pull-request
---

# E04 Spec — Transactional email & invitations end-to-end

Epic [E04 — transactional-email](../../roadmaps/20260711-saas-boilerplate-productization.md#phase-complete-core-loops) (Phase 1 — Complete
the core loops). Objective: introduce a transactional email capability and use it to make workspace
invitations work end-to-end — the invitee receives an email, opens the link, and joins the workspace.
Provider and architecture decisions are in [design.md](./design.md); implementation sequencing in
[plan.md](./plan.md).

## Current status (verified 2026-07-08)

What exists and what does not, checked against the code — not against older `doc/` claims:

| Fact | Evidence |
|---|---|
| **No email SDK or provider integration anywhere** | grep across all `package.json` and source: no `@aws-sdk/client-ses(v2)`, `resend`, `nodemailer`, `sendgrid`, `postmark` |
| Invitation Lambda creates a token but **sends nothing** | `apps/backend/amplify/functions/workspace-membership/handler.ts` — `createInvitation` stores `token: randomUUID()` with a 7-day `expiresAt` (lines 531-543) and returns the literal `'Invitation sent successfully'` (line 554) without any send |
| The UI repeats the lie | `layers/workspaces/components/InviteWorkspaceMemberModal.vue:81` toasts "Invitation sent successfully" |
| Token IS available to OWNER/ADMIN | `GET /api/workspaces/[id]/invitations` returns `token` per pending invitation (`layers/workspaces/server/api/workspaces/[id]/invitations.get.ts:66`), but no UI surfaces it (no copy-link) |
| Accept/decline endpoints exist, **no page consumes them** | `layers/workspaces/server/api/workspaces/[id]/invitations/[invitationId]/{accept,decline}.post.ts`; grep shows no page or component calls them — an invitee has no way to join |
| Backend accept validation is already solid | Lambda enforces PENDING status, expiry (marks `EXPIRED`), **verified-caller email match** (handler.ts:576-578), constant-time token match (":584"), invitation provenance, and never grants OWNER |
| Revoke is supported by backend, absent in UI | `declineInvitation` allows OWNER/ADMIN without a token (handler.ts:685-694); the Pending Invitations block in `layers/saas/pages/settings/members.vue:67-89` renders only a badge — no revoke button, and `useWorkspaceMembers` has no revoke method |
| Cognito emails are unbranded defaults | `apps/backend/amplify/auth/resource.ts` sets only `loginWith: { email: true }` — no subject/body customization, no SES sender; mail arrives from `no-reply@verificationemail.com` |
| E2E infra for real email exists | Gmail IMAP helper in `apps/saas/tests/e2e/helpers/auth.js` (connect, search by TO header, extract 6-digit code); fixtures use plus-addressing (`test+*@ontopix.ai`, `apps/saas/tests/e2e/fixtures/users.json`) |
| Login/signup already honor a redirect target | `layers/saas/pages/auth/{login,signup}.vue:19-20` via `getRedirectUrl` (`layers/auth/utils/index.ts:30`) — reusable for the signed-out invitation path |

Net: the collaboration flow is broken end-to-end for a real invitee, and the product actively claims
otherwise. That claim-vs-reality gap is the primary thing this epic removes.

## Scope

### 1. Provider adapter (email capability)

- Provider-agnostic server util `getEmailProvider()` / `EmailProvider.send()` in
  `layers/amplify/server/utils/email.ts`, with an SES implementation (see design.md D1/D2).
- Config: `runtimeConfig.email = { provider, from }` fed by `EMAIL_FROM`; server-role credentials
  only (design.md D4).
- Setup documentation: SES identity verification, sandbox limits and exit, compute-role wiring.

### 2. Invitation email with acceptance link

- On successful `createInvitation`, the inviting route sends an email to the invitee containing:
  workspace name, inviter name/email, assigned role, the optional personal message, expiry date, and
  an acceptance link of the form
  `{appBaseUrl}/invitations/accept?workspaceId=…&invitationId=…&token=…`.
- The Lambda returns the generated `token` (+ `expiresAt`) to the calling route (exposure parity with
  `invitations.get.ts:66`; rationale in design.md D3).
- Honest responses: the route returns `emailSent: true|false`; invitation creation never fails because
  the email failed. The modal toast reflects reality — success names the recipient; send-failure warns
  and points to the copy-link fallback. The hardcoded `'Invitation sent successfully'` strings
  (Lambda + modal) are removed/replaced.

### 3. `/invitations/accept` page

New page (proposed `layers/workspaces/pages/invitations/accept.vue`) consuming the existing
endpoints. Reads `workspaceId`, `invitationId`, `token` from the query string.

- **Signed-out path**: no auth-middleware auto-redirect; the page renders "Sign in to accept" /
  "Create account" CTAs targeting `/auth/login` and `/auth/signup` with `redirect=<full accept URL>`
  (both pages already honor it), so the user lands back on the invitation after authenticating.
- **Signed-in path**: shows the invitation context and Accept / Decline actions calling
  `POST …/accept` / `POST …/decline` with the token.
- **Email match**: enforced server-side already (handler.ts:576-578). The page must surface the 403
  ("This invitation was sent to a different email address") with guidance to sign out and sign in
  with the invited address — not a generic error.
- **After accept**: force-refresh the Cognito session (the new `ws:<id>:*` groups only appear in
  refreshed tokens — documented in `accept.post.ts`), switch the current workspace to the joined one,
  and land the user in the app.
- **Error states**: missing/malformed query params, expired (400), already accepted/declined (400),
  not found (404), already a member (409) — each rendered distinctly, no dead ends.

### 4. Pending-invitation management UI

In `layers/saas/pages/settings/members.vue` (Pending Invitations block):

- **Revoke** button per pending invitation → `POST …/decline` without token (OWNER/ADMIN path),
  via a new `revokeInvitation()` in `layers/workspaces/composables/useWorkspaceMembers.ts`; list
  refreshes on success.
- **Copy invite link** button per pending invitation, built from the `token` already returned by
  `invitations.get.ts`. This is the SES-sandbox / email-failure fallback that keeps the flow usable.

### 5. Branded Cognito emails

- `apps/backend/amplify/auth/resource.ts`: add `senders.email.fromEmail` (SES-verified identity, plus
  `fromName`) and `loginWith.email` customization (`verificationEmailStyle: 'CODE'` — required by the
  existing UI and e2e code extraction — plus branded subject/body).
- Should-have (only if per-message-type content is required, e.g. a distinct password-reset wording):
  a `CustomMessage` trigger function. Not needed for the sender/branding goals above (design.md D5).

### 6. E2E coverage

- New spec `apps/saas/tests/e2e/specs/flows/workspace-invitation.spec.js` exercising the full loop
  with real email through the existing Gmail IMAP helper (extended with invitation-link extraction):
  invite → receive email → sign up as invitee → accept from the link → membership visible; plus a
  revoke path. Details in plan Phase 6.

## Out of scope (this epic)

| Item | Where it belongs |
|---|---|
| "My pending invitations" view for invitees; ownership transfer; workspace deletion UI | E08 — workspace-lifecycle |
| Dunning / billing emails (`invoice.payment_failed` currently only logs) | Billing follow-up (post-E05) |
| Email marketing, audiences, newsletters | E21 |
| Notification-preference honoring (the preferences page is a non-persisting stub) | E14 |
| Bounce/complaint handling (SNS), delivery analytics, template framework (mjml/vue-email) | Future hardening; note in tech-debt if deferred pain appears |
| In-app notification of invitations | E14 (+ E23 realtime) |

## Acceptance criteria

All criteria are verifiable end-to-end against a deployed sandbox backend.

1. **Invitation email delivered**: inviting `X@domain` from Settings → Members results in an email to
   `X@domain` (observable in the test inbox) containing workspace name, inviter, role and an
   acceptance link with `workspaceId`, `invitationId` and `token` query params.
2. **New-user accept**: a person with no account opens the link signed-out, creates an account with
   the invited email (verification code flow), is returned to the accept page, accepts, and ends up
   in the app with the workspace active — without any manual token handling. The members list shows
   them with the invited role.
3. **Existing-user accept**: a signed-in user with the invited email opens the link and joins in one
   click; their session reflects the new workspace groups without re-login (forced refresh).
4. **Email-match enforcement surfaced**: signed in as a *different* email, the page shows the
   specific mismatch message and a path to switch accounts; the invitation remains PENDING.
5. **Decline**: the invitee can decline from the page; the invitation leaves the workspace's pending
   list and the link stops working (subsequent accept attempts get the "already declined" error state).
6. **Revoke**: an OWNER/ADMIN can revoke a pending invitation from Settings → Members; the entry
   disappears and the emailed link no longer grants access.
7. **Copy link**: an OWNER/ADMIN can copy a working acceptance link for any pending invitation
   (flow completable with email delivery unavailable, e.g. SES sandbox).
8. **No lying UI**: no code path reports an email as sent when it was not; on send failure the
   invitation is still created and the UI says exactly that, pointing to the copy link.
9. **Branded Cognito email**: sign-up verification and password-reset emails arrive from the
   configured `fromEmail`/`fromName` (not `no-reply@verificationemail.com`); the verification email
   still carries a 6-digit code and the existing e2e `verifyEmail` helper passes unchanged.
10. **E2E green**: the new invitation flow spec passes against the sandbox environment; existing auth
    and billing specs remain green.
11. **Docs honest**: setup steps (SES verification, sandbox exit, `EMAIL_FROM`, compute role) are
    documented, and the known capability lies are verifiably gone:
    - `grep -rn "Invitation sent successfully" apps layers` → 0 hits (today:
      `apps/backend/amplify/functions/workspace-membership/handler.ts:554` and
      `layers/workspaces/components/InviteWorkspaceMemberModal.vue:81`);
    - named doc review in the closing PR — `layers/workspaces/README.md` (e.g. the "emailed link"
      wording at line 137), `.context/prd/workspaces.md` (F4/Current status rows), and
      `.context/prd/notifications.md` — each states exactly the implemented email capability
      (SES invitation send + branded Cognito sender), nothing more, with any doc touched listed in
      the PR description.

## Dependencies & risks

- **E01 (green-ci)**: "verified" status for this epic's criteria assumes CI can run the suites.
- **SES sandbox**: until production access, delivery only works to verified identities. Mitigations:
  criteria 7 (copy link) and domain verification for the test inbox domain (covers `test+*` aliases).
- **Token in URL query**: acceptance links carry the capability token; standard practice for invites,
  bounded by the 7-day expiry, single-workspace scope, and the Lambda's email-match check (the token
  alone is not sufficient without being signed in as the invited address). Do not log full URLs of
  `/invitations/accept` requests.
- **Amplify Hosting compute role**: deployed SES sending assumes an attachable server role
  (design.md D4); to be confirmed during plan Phase 1 — fallback is static SES credentials in env
  config (documented, less preferred).
