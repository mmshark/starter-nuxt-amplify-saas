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
├── doc/                      # LEGACY documentation — being migrated into .context/; do not add new docs here
├── .github/workflows/        # ci.yml, publish-layers.yml, publish-on-tag.yml
├── AGENTS.md                 # Single source of truth for AI/contributor context
├── CLAUDE.md                 # Pointer to AGENTS.md (one line, nothing else)
├── .cursor/rules             # Pointer to AGENTS.md (one line, nothing else)
├── taskfile.yaml             # Thin Task helper for sandbox/env housekeeping
├── package.json              # Root scripts = primary command interface
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

## 2. Command interface — `package.json` scripts first, `taskfile.yaml` as helper

Root `package.json` scripts are the **primary** interface. [Task](https://taskfile.dev/) (`taskfile.yaml`) is a **companion helper** for workflows that benefit from precondition checks and composition (env-var validation, multi-step sandbox setup). It wraps the pnpm scripts; it does not replace them.

Primary pnpm scripts (root `package.json`):

| Group | Scripts |
|---|---|
| Sandbox lifecycle | `backend:sandbox:init` / `:delete` / `:secrets` / `:seed` / `:seed:plans` / `:seed:users` |
| Codegen | `amplify:sandbox:generate-outputs`, `amplify:sandbox:generate-graphql-client-code` |
| App dev/build | `saas:dev`, `saas:build`, `landing:dev`, `landing:build`, `landing:generate` |
| Stripe | `billing:stripe:login`, `billing:stripe:listen`, `billing:sandbox:stripe:seed` |
| E2E | `saas:test:e2e` (+ `:auth`, `:billing`, `:headed`, `:ui`, `:clean`, `:setup`) |
| Tooling | `lint`, `lint:fix`, `test` (vitest) |

Actual tasks in `taskfile.yaml` (complete list, verified):

| Task | Purpose |
|---|---|
| `clean` (+ `clean.nuxt`, `clean.amplify`, `clean.test`, `clean.logs`, `clean.node`) | Reset working directory to a clean state |
| `amplify.checks` | Precondition check: `AWS_PROFILE`, `SANDBOX_STACK_NAME` set |
| `amplify.install` | `clean` + `corepack enable` + `pnpm install` |
| `amplify.sandbox.init` / `amplify.sandbox.delete` | Provision / destroy the Amplify sandbox |
| `amplify.sandbox.secrets` | Push sandbox secrets (requires `STRIPE_SECRET_KEY`) |
| `amplify.sandbox.generate` | Generate `amplify_outputs` + typed GraphQL client code |
| `amplify.sandbox.seed` | Seed sandbox (data, plans, users) |
| `amplify.saas.dev` | Checks, then `pnpm saas:dev` |

Rules:

- Add new everyday commands as root `package.json` scripts (delegating to the owning workspace via `pnpm --filter`).
- Add a `task` wrapper only when the workflow needs preconditions or multi-step composition.
- CI (`.github/workflows/ci.yml`) uses the pnpm interface only: `pnpm lint`, `pnpm test`, saas `typecheck` + `build`, landing `generate`.

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
| `prd/` | Product definition + [roadmap](../prd/roadmap.md) (single roadmap, phased) |
| `architecture/` | System overview, tech debt, `decisions/` (ADRs) |
| `patterns/` | `index.md` registry + one file per mandatory code pattern (this file) |
| `operations/` | Runbooks / operational guides |
| `audits/` | `checklists/`, `reports/` (e.g. the 2026-07-08 feature audit) |
| `changelogs/` | Notable outcomes per finished epic |
| `epic/YYYYMMDD-<slug>/` | Per-epic `spec.md` + `plan.md` (+ `tasks.md`) for current-phase epics |

Rules:

- New documentation goes in `.context/`, not `doc/`. `doc/` is the legacy tree being migrated; subdirectories are created in `.context/` as content lands.
- Docs must state what actually exists; unimplemented behavior goes in an explicit "Current status" note (this migration exists because `doc/` drifted from the code).

## Current status

- Everything in the layout tree and both task tables above is verified against the repo as of 2026-07-08.
- **Not implemented** (previously prescribed by the legacy pattern, removed here): generic `task dev` / `task build` / `task test` entry points — use the pnpm scripts; a dedicated `/.infra/` or `/modules/<name>/.infra/` directory for Terraform/CDK/Pulumi — never existed and is not planned; infra is colocated per §3.
- `.context/` is partially populated (migration in progress); missing subdirectories from the §4 table are created as their content is migrated.
