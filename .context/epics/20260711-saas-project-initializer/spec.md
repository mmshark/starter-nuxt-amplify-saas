---
id: 20260711-saas-project-initializer
title: E28 — SaaS project initializer
type: feat
status: planned
created: 2026-07-11
roadmap: 20260711-saas-boilerplate-productization
phase: repeatable-project-initialization
depends_on:
  - 20260711-saas-config-contract
  - 20260711-saas-config-adapters
related:
  - .context/operations/make-it-yours.md
delivery:
  type: pull-request
---

# E28 — SaaS project initializer

## Hypothesis and outcome

We believe that a safe, idempotent initialization workflow will reduce time-to-first-product and
prevent incomplete rebrands because adopters currently follow a long manual checklist.

**Outcome:** `task init` configures a fork's manifest and repository-owned identifiers, prepares the
environment template and verifies the result without editing reusable layer internals.

## Acceptance criteria

1. `task init` is discoverable, non-interactive in CI and optionally interactive for humans.
2. Inputs include product ID/name, package scope, app/landing URLs and initial locales/currency;
   secrets are never accepted or written.
3. The operation is idempotent, shows planned changes, refuses ambiguous/dirty destructive rewrites
   and supports a validation-only mode.
4. Package names, documented commands and manifest imports remain coherent after initialization.
5. `.env` is prepared from `.env.example` without overwriting existing values.
6. The workflow finishes with manifest validation and offline `task ci:all` (or a documented fast
   validation subset), then reports AWS/Stripe operator steps.
7. `.context/operations/make-it-yours.md` explains the automated path and manual escape hatch.
8. A fixture-based test initializes a disposable copy twice and proves the second run is a no-op.

## Non-goals

- Creating AWS accounts, Stripe accounts, domains or secrets.
- Deploying production infrastructure automatically.
- Renaming published `@mmshark/*-layer` packages inside reusable layer source.
