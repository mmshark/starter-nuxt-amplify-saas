# PRD: Onboarding Layer

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
  - [1.3 Key Requirements](#13-key-requirements)
  - [1.4 Artifacts](#14-artifacts)
- [2. User Flows](#2-user-flows)
  - [2.1 New User Onboarding Flow](#21-new-user-onboarding-flow)
  - [2.2 Resume Onboarding Flow](#22-resume-onboarding-flow)
  - [2.3 Skip/Later Flow](#23-skiplater-flow)
- [3. Technical Specifications](#3-technical-specifications)
  - [3.1 Data Model](#31-data-model)
  - [3.2 Configuration Schema](#32-configuration-schema)
  - [3.3 Composables](#33-composables)
  - [3.4 Components](#34-components)
  - [3.5 Middlewares](#35-middlewares)
- [4. Testing](#4-testing)
- [5. Implementation](#5-implementation)

## 1. Overview

### 1.1 Purpose

The Onboarding Layer provides a flexible, configuration-driven engine for guiding users through multi-step setup processes. Its primary goal is to activate new users by ensuring they complete essential setup tasks (e.g., creating a workspace, inviting members, setting preferences) before accessing the main dashboard.

### 1.2 Scope

**Includes**:
- Configurable multi-step wizard engine
- State persistence (remembering progress)
- Conditional step logic (show/hide steps based on data)
- UI components for wizard layout and progress indication
- Integration with Auth (post-signup trigger) and Workspaces (creation step)

**Excludes**:
- The actual content of complex steps (e.g., the workspace creation form logic itself is in Workspaces Layer, but the *step* wrapper is here)
- Marketing landing pages

### 1.3 Key Requirements

**Technical**:
- **Config-Driven**: Steps defined in a JSON/TypeScript configuration, not hardcoded templates.
- **State Management**: Progress saved to user profile or local storage to allow resuming.
- **Extensible**: Easy to add new steps without rewriting the engine.
- **SSR Compatible**: Works seamlessly with Nuxt 4 SSR.

**Functional**:
- Users are redirected to onboarding immediately after signup.
- Users cannot access the dashboard until mandatory onboarding is complete.
- Users can go back and forth between steps.
- Users can skip optional steps.

### 1.4 Artifacts

- `OnboardingConfig` - TypeScript interface for defining flows.
- `useOnboarding()` - Composable for managing wizard state.
- `<OnboardingWizard>` - Main container component.

## 2. User Flows

### 2.1 New User Onboarding Flow

**Actors**: New User

**Preconditions**: User has just signed up and is authenticated.

**Flow**:
1. User completes signup.
2. `auth` middleware detects `!user.onboardingCompleted`.
3. System redirects to `/onboarding`.
4. System loads `default` onboarding flow configuration.
5. **Step 1: Welcome**: User sees welcome message and "Get Started" button.
6. **Step 2: Create Workspace**: User fills out workspace details (integrated from Workspaces Layer).
7. **Step 3: Invite Team**: User invites colleagues (optional).
8. **Step 4: Personalize**: User selects role/interests.
9. **Completion**: User clicks "Finish".
10. System marks `onboardingCompleted = true` in UserProfile.
11. System redirects to `/dashboard`.

### 2.2 Resume Onboarding Flow

**Flow**:
1. User closes browser on Step 2.
2. User logs in later.
3. System detects `!user.onboardingCompleted`.
4. System redirects to `/onboarding`.
5. System restores state to Step 2.

## 3. Technical Specifications

### 3.1 Data Model

**UserProfile Update** (Auth Layer):
```typescript
interface UserProfile {
  // ... existing fields
  onboardingStatus: {
    completed: boolean;
    currentStep: string; // ID of the current step
    data: Record<string, any>; // Temporary data collected during onboarding
    lastUpdated: string;
  }
}
```

### 3.2 Configuration Schema

**Location**: `layers/onboarding/config/flows.ts`

```typescript
export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  component: string; // Vue component name to render
  required: boolean;
  condition?: (context: OnboardingContext) => boolean; // Dynamic visibility
}

export interface OnboardingFlow {
  id: string;
  steps: OnboardingStep[];
}

export const DEFAULT_FLOW: OnboardingFlow = {
  id: 'default',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome',
      component: 'OnboardingStepWelcome',
      required: true
    },
    {
      id: 'create-workspace',
      title: 'Create your Workspace',
      component: 'OnboardingStepWorkspace',
      required: true
    },
    {
      id: 'invite-team',
      title: 'Invite your Team',
      component: 'OnboardingStepInvite',
      required: false
    }
  ]
}
```

### 3.3 Composables

**`useOnboarding()`**

```typescript
interface UseOnboarding {
  // State
  currentStep: ComputedRef<OnboardingStep>;
  progress: ComputedRef<number>; // 0-100
  isComplete: ComputedRef<boolean>;

  // Actions
  next: () => Promise<void>;
  back: () => void;
  skip: () => void;
  complete: () => Promise<void>;
  saveState: (data: any) => Promise<void>;
}
```

### 3.4 Components

- `<OnboardingWizard>`: Layout wrapper, handles navigation (Next/Back buttons) and progress bar.
- `<StepIndicator>`: Visual progress tracker (dots or numbered list).
- `<OnboardingStepWrapper>`: Dynamic component renderer for the current step.

### 3.5 Middlewares

**`onboarding.ts`**
- Checks `user.onboardingStatus.completed`.
- If `false` and not on `/onboarding`, redirect to `/onboarding`.
- If `true` and on `/onboarding`, redirect to `/dashboard`.

## 5. Implementation

### 5.1 Layer Structure

```
layers/onboarding/
├── components/
│   ├── OnboardingWizard.vue
│   ├── StepIndicator.vue
│   └── steps/
│       ├── Welcome.vue
│       └── ...
├── composables/
│   └── useOnboarding.ts
├── config/
│   └── flows.ts
├── middleware/
│   └── onboarding.ts
└── types/
    └── onboarding.ts
```

### 5.2 Plan
See [Onboarding Implementation Plan](../plan/onboarding.md).
