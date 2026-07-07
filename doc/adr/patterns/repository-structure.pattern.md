# Pattern: Repository Structure & Operations

## Context
A consistent repository structure and operational interface are essential for onboarding new developers (and AI agents) and ensuring that infrastructure and tooling remain manageable as the project grows.

## Problem
- **Fragmented Context**: AI agents (Cursor, Claude, etc.) look at different files (`.cursorrules`, `CLAUDE.md`) leading to inconsistent behavior.
- **Hidden Scripts**: Useful commands are buried in `package.json` or scripts folders, making them hard to discover and chain.
- **Infrastructure Sprawl**: Terraform/IaC code mixed with application code makes deployment boundaries unclear.

## Solution
Standardize the "entry points" for information and operations:
1.  **`AGENTS.md`**: The Single Source of Truth (SSOT) for context.
2.  **`taskfile.yaml`**: A companion helper for sandbox/environment operations (complements, not replaces, `package.json` scripts).
3.  Infrastructure as Code lives inside `apps/backend/amplify/` (Amplify Gen2, CDK-based) plus one `amplify.yml` build spec per deployable app — there is no separate `.infra/` or `modules/` directory in this repository.

## Pattern Details

### 1. AI Context (`AGENTS.md`)
`AGENTS.md` is the master document. All other tool-specific configuration files must **only** reference it.

- **`AGENTS.md`**: Contains architecture, patterns, roadmap, and critical instructions.
- **`.cursor/rules`, `CLAUDE.md`, etc.**: Should contain a single instruction: "Read `AGENTS.md` for all context and rules."

### 2. Task Automation (`taskfile.yaml`)
This repository uses [Task](https://taskfile.dev/) via a root `taskfile.yaml`, but only as a thin helper for local environment/sandbox housekeeping — it does **not** replace `package.json` scripts. Everyday commands (`pnpm saas:dev`, `pnpm saas:build`, `pnpm lint`, `pnpm test`, etc., see root `package.json`) remain the primary interface; `task` wraps the subset of workflows that benefit from precondition checks and composition (env var validation, multi-step sandbox setup).

**Actual Tasks** (see `taskfile.yaml`):
- **`clean`** (and `clean.nuxt`, `clean.amplify`, `clean.test`, `clean.logs`, `clean.node`): Reset the working directory to a clean state.
- **`amplify.checks`**: Validate required env vars (`AWS_PROFILE`, `SANDBOX_STACK_NAME`) before sandbox operations.
- **`amplify.install`**: Clean + reinstall dependencies.
- **`amplify.sandbox.init`** / **`amplify.sandbox.delete`**: Provision / destroy the Amplify sandbox backend.
- **`amplify.sandbox.secrets`**: Push sandbox secrets (e.g. `STRIPE_SECRET_KEY`).
- **`amplify.sandbox.generate`**: Generate Amplify outputs and the typed GraphQL client code.
- **`amplify.sandbox.seed`**: Seed the sandbox (plans, users).
- **`amplify.saas.dev`**: Run sandbox checks, then start the SaaS app dev server.

> **Aspirational / not yet implemented**: generic `task dev` / `task build` / `task test` entry points do not exist today — use the equivalent `pnpm` scripts instead. Adding them (as thin wrappers around the existing `pnpm` scripts) is a reasonable future improvement but is not current behavior.

### 3. Infrastructure

> **Aspirational / not yet implemented**: this section previously prescribed a dedicated `/.infra/` (and `/modules/<name>/.infra/`) directory for Terraform/CDK/Pulumi code. No such directory exists in this repository, and none is planned as a separate concept — see the actual pattern below.

**Actual pattern**: Infrastructure as Code is Amplify Gen2 (CDK under the hood), colocated with the backend app at `apps/backend/amplify/` (auth, data, functions, storage definitions). Each deployable app additionally ships its own `amplify.yml` (`apps/backend/amplify.yml`, `apps/saas/amplify.yml`, `apps/landing/amplify.yml`) — a build spec consumed by AWS Amplify Console/Hosting to build and deploy that app. There is no separate infra-only directory or module system; infra definitions live next to the code that owns them.

**Rules:**
- Application code should not contain infra definitions (except for framework-specific config like `nuxt.config.ts` or `amplify.yml`).
- Secrets for infra should be managed via `.env` or a secrets manager, never committed.
