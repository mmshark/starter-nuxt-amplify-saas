# E04 Design — Email provider decision

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new

Design decision for roadmap epic [E04 — transactional-email](../../prd/roadmap.md#e04--transactional-email):
which email provider to adopt, where the sending code lives, and from where emails are sent.

## Decisions at a glance

| # | Decision | Choice |
|---|---|---|
| D1 | Provider | **Amazon SES** (behind a provider-agnostic interface; Resend stays a drop-in alternative) |
| D2 | Adapter location | **`layers/amplify/server/utils/email.ts`** (no new layer) |
| D3 | Send point for invitation email | **Nitro route** (`invite.post.ts`), not the `workspace-membership` Lambda |
| D4 | Credentials for sending | Server-role credentials (dev: AWS profile; deployed: Amplify Hosting SSR compute role) — **never** the identity-pool user role |
| D5 | Cognito email branding | `defineAuth` `senders.email` (SES) + `loginWith.email` template customization; CustomMessage trigger only if per-message-type templates are needed |

## Context

Verified current state (2026-07-08): the repo has **zero email capability**. No email SDK
(`@aws-sdk/client-ses(v2)`, `resend`, `nodemailer`, `sendgrid`, `postmark`) appears in any
`package.json` or source file. The only emails users ever receive are Cognito's default
verification/reset messages sent from `no-reply@verificationemail.com`
(`apps/backend/amplify/auth/resource.ts` configures only `loginWith: { email: true }`).
The workspace invitation flow creates a token but sends nothing — see
[spec.md](./spec.md#current-status-verified-2026-07-08) for the full gap inventory.

Constraints that shape the decision:

- The starter is **intentionally Amplify-native** (roadmap "Out of scope": no non-AWS portability goal).
- Emails must eventually be sent from two places: the Nuxt/Nitro server (app emails) and
  **Cognito itself** (verification/reset emails — Cognito can only send via its default sender or SES).
- Future epics will reuse the capability: dunning emails (billing), email marketing (E21),
  notifications (E14).
- E2E tests verify real email delivery through a Gmail IMAP helper
  (`apps/saas/tests/e2e/helpers/auth.js`), so whichever provider is chosen must deliver to a real
  Gmail-backed inbox in the test environment.

## D1 — Provider: SES vs Resend

### Option A — Amazon SES

| Aspect | Assessment |
|---|---|
| Fit with stack | AWS-native; same account/region as the Amplify backend. Consistent with the repo's explicit Amplify-native positioning. |
| Auth model | IAM — no API key to provision, store, or rotate. A role policy grants `ses:SendEmail`. |
| Cognito integration | **Only provider Cognito can send through.** `defineAuth({ senders: { email: { fromEmail } } })` switches Cognito's sender to an SES-verified identity — one provider covers both app emails and branded auth emails (verified against current Amplify Gen2 docs). |
| Cost | ~$0.10 / 1,000 emails; no monthly floor. |
| Sandbox limitation | **New SES accounts start in sandbox**: recipients must be verified identities, ~200 msgs/24 h, 1 msg/s. Production access requires a support request (typically <24 h). Real onboarding friction for starter adopters. |
| DX | Bare: no template preview, no delivery dashboard beyond CloudWatch metrics; bounces/complaints need SNS wiring (out of scope here). |
| Domain setup | Verify a domain (Easy DKIM: 3 CNAME records) or a single address for dev. |

### Option B — Resend

| Aspect | Assessment |
|---|---|
| Fit with stack | Third-party SaaS; adds a vendor account to the starter's setup checklist. |
| Auth model | API key — needs secret management twice: env var for Nitro, `secret()` for any Lambda sender. |
| Cognito integration | **None.** Cognito cannot send through Resend; branded auth emails would still require SES (or stay on the default sender with a CustomMessage trigger changing only the content, not the from-address). Net result: two providers. |
| Cost | Free tier (order of a few thousand emails/month) is comfortable for a starter; paid tiers above. |
| Sandbox equivalent | Can send from `onboarding@resend.dev` to the account owner's own address without domain setup — smoother first-run than SES sandbox. |
| DX | Excellent: simple SDK, dashboard with delivered/opened logs, test mode, first-class template tooling (react-email / vue-email). |
| Domain setup | DNS verification (DKIM/SPF) still required for a custom from-address — same order of effort as SES. |

### Decision: SES

Rationale, in order of weight:

1. **Cognito forces the issue.** Branded auth emails (in scope for this epic) can only leave the
   default `no-reply@verificationemail.com` sender via SES. Choosing Resend for app emails means
   running two providers and two domain verifications; choosing SES means one.
2. **No secret to manage.** The IAM path removes an entire class of setup/rotation/leak concerns; the
   repo already uses IAM-scoped roles as its security pattern (`apps/backend/amplify/backend.ts`).
3. **Positioning.** The roadmap explicitly declares the starter Amplify-native; SES is the default
   answer an Amplify adopter expects.
4. The main SES cost — sandbox friction — is mitigated in this epic by the **copy-invite-link
   fallback** ([spec.md](./spec.md), scope item 4): invitations remain fully usable before production
   access is granted, and the ops setup doc (plan Phase 1) makes the sandbox exit a documented step.

Resend's DX is genuinely better; the provider-agnostic interface (below) is sized so a
`ResendProvider` is a ~30-line drop-in for adopters who prefer it.

## D2 — Adapter location: `layers/amplify/server/utils/email.ts`

Considered:

| Option | Verdict |
|---|---|
| New layer `layers/email` (`@mmshark/email-layer`) | Rejected for now: a full layer (package.json, nuxt.config, README, publish wiring) for one server util is overhead; nothing about email needs components/composables/pages yet. Revisit if E14/E21 grow real template tooling. |
| `layers/amplify/server/utils/email.ts` | **Chosen.** Precedent exists: `layers/amplify/server/utils/workspaceMembership.ts` already hosts cross-layer server plumbing precisely so other layers (workspaces, billing) can share it without dependency cycles. Every layer already extends/imports `@mmshark/amplify-layer`. |

Interface sketch (kept minimal and h3-free so it stays portable):

```ts
export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<{ messageId: string }>
}

// Factory reads runtimeConfig.email = { provider: 'ses', from: EMAIL_FROM }
export function getEmailProvider(): EmailProvider
```

Feature-specific templates do **not** live in the amplify layer: each owning layer renders its own
content (e.g. `renderInvitationEmail()` in the workspaces layer) and passes html/text to the adapter.
No template framework (mjml/vue-email) in v1 — hand-written HTML + text parts.

## D3 — Send point: Nitro route, not the Lambda

The invitation row is created inside the `workspace-membership` Lambda
(`apps/backend/amplify/functions/workspace-membership/handler.ts`, `createInvitation`), invoked from
the Nitro route `layers/workspaces/server/api/workspaces/[id]/members/invite.post.ts`. The email
could be sent from either side.

| | Lambda sends | Nitro route sends (**chosen**) |
|---|---|---|
| IAM | Trivial: one `addToRolePolicy(ses:SendEmail)` line in `backend.ts` | Needs a server-side credential distinct from user credentials (see D4) |
| Provider swap | Requires a backend redeploy; adapter code must be duplicated or shared into `apps/backend` | Adapter + provider choice live in one place, reusable by every future Nitro email (billing, notifications) |
| Coupling | Couples email/templating/branding to the tenancy-critical Lambda | Lambda keeps its single responsibility: data writes + Cognito groups |
| Token access | Already has it | Lambda must return the invitation `token` to the calling route |

Returning the token to the caller is **not** an exposure change: the caller is a verified
OWNER/ADMIN, and `GET /api/workspaces/[id]/invitations`
(`layers/workspaces/server/api/workspaces/[id]/invitations.get.ts:66`) already returns stored tokens
to exactly that audience. The copy-invite-link feature relies on the same fact.

Failure semantics: invitation creation and email delivery are decoupled — if `send()` throws, the
route still returns the created invitation with `emailSent: false` and the UI falls back to the copy
link. This also ends the current honesty bug ("Invitation sent successfully" when nothing is sent).

## D4 — Credentials model

This matters because the existing Nitro→AWS pattern is the wrong one for SES: routes call
`getAwsCredentials(contextSpec)` (`layers/amplify/server/utils/amplify.ts`), which yields the
**signed-in user's** identity-pool authenticated-role credentials. Granting that role `ses:SendEmail`
would let any authenticated user send arbitrary email from the app's domain directly. Therefore:

- The SES client in the adapter uses the **default AWS SDK credential chain** (no per-user creds):
  - Local dev: the developer's AWS profile / env credentials (already required to run the sandbox backend).
  - Deployed: an **Amplify Hosting SSR compute role** attached to `apps/saas`, with a policy allowing
    `ses:SendEmail` on the verified identity. (Compute roles for SSR apps are an Amplify Hosting
    feature; confirming the exact console/CLI wiring is an implementation task in plan Phase 1.)
- The identity-pool roles get **no** SES permissions.

## D5 — Cognito email branding mechanism

Verified against current Amplify Gen2 docs:

- `defineAuth({ senders: { email: { fromEmail, fromName, replyTo } } })` — Cognito sends via SES from
  a verified identity. This fixes the `no-reply@verificationemail.com` problem.
- `loginWith: { email: { verificationEmailStyle: 'CODE', verificationEmailSubject, verificationEmailBody: (createCode) => ... } }`
  — brands the verification message. **`CODE` style must be kept**: the sign-up UI
  (`layers/auth/components/Authenticator.vue`) and the e2e helper (`extractCode`, 6-digit regex in
  `apps/saas/tests/e2e/helpers/auth.js:86-90`) both depend on a code, not a link.
- A **CustomMessage trigger** is only needed for per-message-type templates (e.g. a differently worded
  password-reset email — `defineAuth` has no dedicated reset-template field). It changes content, not
  the sender. Deferred to a should-have; see spec.

## Consequences

- New dependency: `@aws-sdk/client-sesv2` in `layers/amplify/package.json` (sits next to the existing
  `@aws-sdk/client-lambda`).
- New required environment/config: `EMAIL_FROM` (must be an SES-verified identity) and the documented
  SES setup steps (domain/address verification, sandbox exit) — deliverable in plan Phase 1.
- The SES sandbox affects e2e: verifying the `ontopix.ai` domain (or the test inbox address) in SES
  covers the plus-addressed test recipients (`test+*@ontopix.ai`,
  `apps/saas/tests/e2e/fixtures/users.json`) even before production access.
- Swapping providers later = implementing `EmailProvider.send()` for the new vendor and changing
  `runtimeConfig.email.provider`; no call sites change.
