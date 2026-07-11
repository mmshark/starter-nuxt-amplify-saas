# Pattern: Repository Structure & Operations

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/patterns/repository-structure.pattern.md

**Normative** — contributors and AI agents MUST follow this pattern. It defines where things live in the repository and what the standard entry points for context and operations are.

## Context

A consistent structure and a single operational interface keep onboarding cheap (for humans and AI agents) and deployment boundaries clear. Without it: agents read different context files and behave inconsistently, useful commands get buried, and infra code sprawls into application code.

## Repository layout

```
├── apps/                     # Deployable applications (pnpm workspace: apps/*)
│   ├── backend/              #   Amplify Gen2 backend (@starter-nuxt-amplify-saas/backend)
│   │   ├── amplify/          #     IaC: auth/, data/, functions/, seed/, backend.ts
│   │   └── amplify.yml       #     Amplify Hosting build spec for the backend
│   ├── saas/                 #   SaaS dashboard app, Nuxt 4 (@starter-nuxt-amplify-saas/saas)
│   └── landing/              #   Marketing site, Nuxt 4 (@starter-nuxt-amplify-saas/landing)
├── layers/                   # Nuxt Layers (pnpm workspace: layers/*), published as @mmshark/<name>-layer
│   ├── amplify/  auth/  billing/  workspaces/  entitlements/
│   ├── i18n/     uix/   saas/     debug/
├── scripts/                  # Repo tooling (layer publishing to GitHub Packages)
├── .context/                 # Agent/contributor documentation tree (see below)
├── .github/workflows/        # ci.yml, publish-layers.yml, publish-on-tag.yml
├── AGENTS.md                 # Single source of truth for AI/contributor context
├── CLAUDE.md                 # Pointer to AGENTS.md (one line, nothing else)
├── .cursor/rules             # Pointer to AGENTS.md (one line, nothing else)
├── taskfile.yaml             # Single operational interface (Taskfile as Contract)
├── package.json              # Underlying scripts invoked by Taskfile tasks
├── pnpm-workspace.yaml       # packages: apps/*, layers/*
├── eslint.config.mjs         # Flat ESLint config (root `pnpm lint`)
└── vitest.config.ts          # Root unit-test config (`pnpm test`)
```

Rules:

- New reusable code goes in a **layer** (`layers/<name>/` with `nuxt.config.ts`, `package.json`, `README.md`); apps compose layers, they do not duplicate them. Prefer package imports (`@mmshark/<name>-layer`) over relative `../..` paths across workspaces.
- New deployable apps go in `apps/` and get their own `amplify.yml` build spec.
- Repo-level tooling scripts go in `scripts/` (current contents: `generate-layer-packages.js`, `publish-layer.sh`, `publish-all-layers.sh`, `verify-layers.sh` — all for layer publishing).

## 1. AI/contributor context — `AGENTS.md` is the SSOT

`AGENTS.md` is the master document (architecture, patterns, critical instructions). All tool-specific context files MUST contain only a pointer to it — never duplicated content.

Verified current state: both `CLAUDE.md` and `.cursor/rules` contain exactly one line — "See AGENTS.md for all development instructions, patterns, and architectural decisions."

If a change contradicts `AGENTS.md`, update `AGENTS.md` in the same change (its "Coherence Principle").

## 2. Command interface — Taskfile as Contract

[`taskfile.yaml`](../../taskfile.yaml) is the **single operational interface** for contributors and
agents. Tasks use colon-separated `namespace:action[:target]` names, each has a description, and
multi-step/env-sensitive workflows encode their preconditions there. Root/workspace `package.json`
scripts remain the implementation behind tasks and are available only for ad-hoc slicing when no
task represents the operation.

Underlying pnpm scripts (root `package.json`):

| Group | Scripts |
|---|---|
| Sandbox lifecycle | `backend:sandbox:init` / `:delete` / `:secrets` / `:seed` / `:seed:plans` / `:seed:users` |
| Codegen | `amplify:sandbox:generate-outputs`, `amplify:sandbox:generate-graphql-client-code` |
| App dev/build | `saas:dev`, `saas:build`, `landing:dev`, `landing:build`, `landing:generate` |
| Stripe | `billing:stripe:login`, `billing:stripe:listen`, `billing:sandbox:stripe:seed` |
| E2E | `saas:test:e2e` (+ `:auth`, `:billing`, `:headed`, `:ui`, `:clean`, `:setup`) |
| Tooling | `lint`, `lint:fix`, `test` (vitest) |

Task namespaces in `taskfile.yaml` (discover the current complete list with `task --list`):

| Task | Purpose |
|---|---|
| `setup:*` | Prepare env and install dependencies |
| `dev:*` / `build:*` | Run or build SaaS and landing apps |
| `lint:*` / `test:*` / `ci:*` | Quality gates and the local CI mirror |
| `sandbox:*` | Check, deploy, generate, seed, set secrets and delete the Amplify cloud sandbox |
| `billing:*` | Stripe CLI login, listener and fixture operations |
| `clean:*` | Remove generated artifacts by category |

Rules:

- Add or update the owning package script first, then expose every supported contributor workflow as
  a discoverable task.
- Agents MUST use a Taskfile task when one exists. Direct package commands are limited to narrower
  diagnostic/test slices that have no task.
- CI calls Taskfile tasks; `task ci:all` is the local contract for the complete CI pipeline.

## 3. Infrastructure — colocated Amplify Gen2, no separate infra tree

Infrastructure as Code is AWS Amplify Gen2 (CDK under the hood), **colocated with the backend app** at `apps/backend/amplify/` (`auth/`, `data/`, `functions/`, `seed/`, `backend.ts`). Each deployable app additionally ships its own `amplify.yml` build spec (`apps/backend/amplify.yml`, `apps/saas/amplify.yml`, `apps/landing/amplify.yml`) consumed by AWS Amplify Hosting.

Rules:

- Infra definitions live next to the code that owns them. There is **no** separate infra-only directory and no module system.
- Application code MUST NOT contain infra definitions, except framework config (`nuxt.config.ts`, `amplify.yml`).
- Secrets are managed via `.env` (gitignored) or the Amplify sandbox secret store (`task amplify.sandbox.secrets`) — never committed.

## 4. Documentation — `.context/` tree

Agent-facing documentation lives in `.context/`, per the org-level `repository-context-directory` pattern:

| Directory | Content |
|---|---|
| `prd/` | Product definitions, requirements and prioritization rationale |
| `roadmaps/YYYYMMDD-<slug>.md` | Medium-term outcomes, phases and epic sequencing |
| `architecture/` | System overview, tech debt, `decisions/` (ADRs) |
| `patterns/` | `index.md` registry + one file per mandatory code pattern (this file) |
| `operations/` | Runbooks / operational guides |
| `audits/` | `checklists/`, `reports/` (e.g. the 2026-07-08 feature audit) |
| `changelogs/` | Notable outcomes per finished epic |
| `epics/YYYYMMDD-<slug>/` | Atomic delivery `spec.md` + `plan.md`, with optional `design.md`, `tasks.md` and `handoff.md` |

Rules:

- New documentation goes in `.context/`. The legacy `doc/` tree was deleted by ADR-003 and must not
  be recreated.
- Planning follows the Ontopix Roadmap and Epic Planning metadata, lifecycle and branch conventions
  registered in [index.md](index.md).
- Docs must state what actually exists; unimplemented behavior goes in an explicit "Current status" note (this migration exists because `doc/` drifted from the code).

## Current status

- Everything in the layout tree and both task tables above is verified against the repo as of 2026-07-08.
- **Not implemented** (previously prescribed by the legacy pattern, removed here): generic `task dev` / `task build` / `task test` entry points — use the pnpm scripts; a dedicated `/.infra/` or `/modules/<name>/.infra/` directory for Terraform/CDK/Pulumi — never existed and is not planned; infra is colocated per §3.
- `.context/` is partially populated (migration in progress); missing subdirectories from the §4 table are created as their content is migrated.
