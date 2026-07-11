# PRD: User Onboarding

> **Status**: Future · **Created**: 2026-07-08 · **Source**: doc/archive/prd/onboarding.md

## Purpose & scope

A configuration-driven, multi-step onboarding engine that activates new users after signup: it guides them through mandatory setup (workspace exists, basics configured) before they reach the app, persists progress so the wizard can be resumed, and is extensible without rewriting the engine.

**In scope**: wizard engine (config-defined steps, conditional visibility), progress persistence, resume/skip flows, wizard UI components, redirect middleware, integration with auth (post-signup) and workspaces (creation step).

**Out of scope**: the internal logic of complex steps (e.g. the workspace-creation form belongs to the workspaces layer; onboarding only wraps it as a step), marketing/landing pages.

**None of the wizard is implemented today** — see [Current status](#current-status). This PRD is the target spec for roadmap epic [E15 — onboarding](../roadmaps/20260711-saas-boilerplate-productization.md).

## Requirements

### Functional

| # | Requirement |
|---|---|
| F1 | New users are redirected to `/onboarding` immediately after signup. |
| F2 | Users with incomplete mandatory onboarding cannot reach the app; completed users hitting `/onboarding` are redirected to the app home (`/`). |
| F3 | Users can navigate back/forward between steps and skip optional steps. |
| F4 | Progress persists server-side; closing the browser mid-flow and logging in later resumes at the saved step. |
| F5 | Steps are defined in configuration (TypeScript), not hardcoded templates; steps can be conditionally shown based on collected data. |
| F6 | Completing the flow marks onboarding complete and redirects to the app home. |

### Technical

- **Config-driven**: flows declared in `layers/onboarding/config/flows.ts` (planned layer, does not exist yet).
- **SSR-compatible** with Nuxt 4.
- **Extensible**: adding a step = adding a config entry + a step component.

### Data model

`UserProfile` (Amplify Data, `apps/backend/amplify/data/resource.ts`) must be extended with onboarding state:

```typescript
onboardingStatus: {
  completed: boolean
  currentStep: string            // id of the current step
  data: Record<string, any>      // data collected during the flow
  lastUpdated: string
}
```

**Prerequisite — authorization change**: today `UserProfile` has only `userId` and `stripeCustomerId`, and its sole writer is the post-confirmation Lambda (owner is read-only). Persisting progress requires either an owner-authorized update mutation on these fields or a dedicated server route that writes on the user's behalf.

### Configuration schema

```typescript
interface OnboardingStep {
  id: string
  title: string
  description?: string
  component: string                                   // step component to render
  required: boolean
  condition?: (context: OnboardingContext) => boolean // dynamic visibility
}

interface OnboardingFlow {
  id: string          // e.g. 'default'
  steps: OnboardingStep[]
}
```

Default flow: **welcome** (required) → **create-workspace** (required) → **invite-team** (optional). Note: post-signup provisioning already creates a "Personal" workspace automatically (see Current status), so the `create-workspace` step must reconcile with that — e.g. rename/configure the auto-provisioned workspace rather than create a duplicate.

### Composable

```typescript
interface UseOnboarding {
  currentStep: ComputedRef<OnboardingStep>
  progress: ComputedRef<number>        // 0-100
  isComplete: ComputedRef<boolean>
  next: () => Promise<void>
  back: () => void
  skip: () => void
  complete: () => Promise<void>
  saveState: (data: any) => Promise<void>
}
```

### Components

- `<OnboardingWizard>` — layout wrapper: navigation (Next/Back) + progress bar.
- `<StepIndicator>` — visual progress tracker.
- `<OnboardingStepWrapper>` — dynamic renderer for the current step component.

### Middleware

`onboarding` route middleware: if `!onboardingStatus.completed` and route is not `/onboarding` → redirect to `/onboarding`; if completed and on `/onboarding` → redirect to `/`.

## Current status

Audit (2026-07): implementation 2/5, quality 2/5, effort M–L, priority medium. There is no `layers/onboarding/` and no `/onboarding` route.

| Capability | Status | Evidence |
|---|---|---|
| Post-signup provisioning (UserProfile, per-workspace Cognito groups, "Personal" workspace with OWNER role, Stripe customer + free subscription) | **Implemented** | `apps/backend/amplify/auth/post-confirmation/handler.ts` |
| `/onboarding` page/route + wizard (`OnboardingConfig`, `flows.ts`, `<OnboardingWizard>`, `<StepIndicator>`) | **Missing** | No `layers/onboarding/`; zero matches for an onboarding route |
| `useOnboarding()` composable | **Missing** | Does not exist anywhere in the repo |
| Progress persistence in `UserProfile` | **Missing** | Model has only `userId` + `stripeCustomerId`; client-read-only (only writer is the post-confirmation Lambda) — `apps/backend/amplify/data/resource.ts:53` |
| Redirect middleware for incomplete onboarding | **Missing** | `layers/auth/middleware/auth.ts` has no onboarding logic |
| Onboarding layout shell | **Orphaned** | `layers/saas/layouts/onboarding.vue` exists (branding, progress bar via `?step=`/`?total=` query params, "Skip for now" link) but zero pages use `layout: 'onboarding'` |
| `saas.features.onboarding` feature flag | **Dead** | Declared `true` in `layers/saas/app.config.ts:15`, typed in `layers/saas/types/saas-config.ts:34`; no code reads it |

## Open issues & risks

- **Dead code/config misleads adopters**: the orphaned layout and the unread `features.onboarding: true` flag suggest a feature that does not exist. Either wire them up in E15 or remove them.
- **Legacy doc drift still live**: `doc/prd/saas-layer.md` lists "✅ Onboarding flow" and `onboarding.vue` pages that do not exist; `doc/prd/workspaces.md` describes a redirect to `/onboarding` that no code performs; `layers/saas/README.md` documents the onboarding layout as a working "first-time user setup layout". These claims must not be carried into migrated docs.
- **Silent provisioning failures**: the post-confirmation handler wraps everything in a try/catch that swallows errors so signup never fails (`apps/backend/amplify/auth/post-confirmation/handler.ts:129-133`). A user can therefore land in the app without a workspace/profile; an onboarding wizard is a natural place to detect and repair this, but the spec above does not yet cover it.
- **UserProfile write path is a blocker**: no wizard state can persist until the authorization model for `UserProfile` is extended (see Data model prerequisite).
- **Step overlap with auto-provisioning**: the `create-workspace` step must not conflict with the workspace already created by the Lambda.

## Related

- [Roadmap](../roadmaps/20260711-saas-boilerplate-productization.md) — Next epic E15 owns the wizard, persistence and middleware; the feature remains explicitly future until its acceptance criteria pass.
- Sibling PRDs: auth and workspaces PRDs are not yet migrated to `.context/prd/`; legacy versions live at `doc/prd/auth.md` and `doc/prd/workspaces.md` (contain drift — verify before relying on them).
- Patterns: [layers](../patterns/layers.md) (the planned `layers/onboarding/` follows the standard layer structure), [composables](../patterns/composables.md) (`useOnboarding()` conventions), [api-server](../patterns/api-server.md) (if persistence goes through a server route).
