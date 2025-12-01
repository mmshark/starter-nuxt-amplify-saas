# Implementation Plan: Onboarding Layer

## Phases

### Phase 1: Engine & Config (Week 1)
**Goal**: Core wizard engine

**Tasks**:
1. Define OnboardingConfig types
2. Implement useOnboarding() composable
3. Create config/flows.ts
4. Implement state persistence (localStorage/API)

**Deliverables**:
- Functional wizard engine
- State management

### Phase 2: Components (Week 1)
**Goal**: UI components

**Tasks**:
1. Create <OnboardingWizard> layout
2. Create <StepIndicator> component
3. Create <OnboardingStepWrapper>
4. Implement default steps (Welcome, Workspace)

**Deliverables**:
- Wizard UI
- Default steps

### Phase 3: Integration (Week 2)
**Goal**: Connect to app

**Tasks**:
1. Implement onboarding middleware
2. Add post-signup redirect
3. Integrate with Workspaces for creation step

**Deliverables**:
- Full user flow
