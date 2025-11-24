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
2.  **`Taskfile`**: The SSOT for operations.
3.  **`.infra/`**: The dedicated location for Infrastructure as Code.

## Pattern Details

### 1. AI Context (`AGENTS.md`)
`AGENTS.md` is the master document. All other tool-specific configuration files must **only** reference it.

- **`AGENTS.md`**: Contains architecture, patterns, roadmap, and critical instructions.
- **`.cursor/rules`, `CLAUDE.md`, etc.**: Should contain a single instruction: "Read `AGENTS.md` for all context and rules."

### 2. Task Automation (`Taskfile`)
Use [Task](https://taskfile.dev/) (`taskfile.yaml`) to define operational commands. This replaces complex `package.json` scripts and allows for better documentation and dependency management.

**Standard Tasks:**
- **`dev`**: Start development environment.
- **`build`**: Build the project.
- **`test`**: Run tests.

**Sandbox Helpers (if applicable):**
For projects with ephemeral environments:
- **`sandbox:init`**: Provision resources.
- **`sandbox:stop`**: Pause/Stop resources to save costs.
- **`sandbox:delete`**: Destroy resources.

### 3. Infrastructure (`.infra`)
Infrastructure as Code (Terraform, CDK, Pulumi) must be isolated.

- **Global Infra**: `/.infra/` (at root).
- **Module Infra**: `/modules/<name>/.infra/` (if the module is autonomous).

**Rules:**
- Application code should not contain infra definitions (except for framework-specific config like `nuxt.config.ts` or `amplify.yml`).
- Secrets for infra should be managed via `.env` or a secrets manager, never committed.
