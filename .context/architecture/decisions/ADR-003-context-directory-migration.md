# ADR-003: Migrate documentation from doc/ to .context/

> **Status**: Active · **Created**: 2026-07-08 · **Source**: new

## Context

Documentation lived in `doc/` (adr, prd, plan, analysis, guides, archive) and suffered severe
**documentation drift**: documents claimed capabilities the code does not have. The 2026-07-08
verified feature audit (the ground truth behind [../../prd/roadmap.md](../../prd/roadmap.md))
found, among others: gap analyses grading most layers "~95% complete / A+" while core flows
(invitations, free→paid upgrade, i18n consumption, storage) are broken or absent; READMEs and
PRDs describing components and composables that were never written; plans referencing removed
technology (tRPC, Nuxt UI Pro). Agents and contributors were instructed to consult these
documents, so the drift actively caused wrong decisions.

## Decision

On **2026-07-08**, `doc/` was migrated to **`.context/`**, following the Ontopix
*Repository Context Directory* organizational pattern (Ontopix engineering handbook,
**ADR-0010 — Repository Context Directory Convention**).

1. **`.context/` is the single documentation source of truth.** `doc/` is deleted at the end
   of the migration change-set; nothing may cite it as current.
2. **Structure** (per the pattern, adapted to this repo):

   ```text
   .context/
     prd/            # product requirements + roadmap.md (queue of record)
     architecture/   # overview, tech-debt, decisions/ (ADRs, this file)
     patterns/       # one normative pattern per file
     operations/     # runbooks (setup, deploy, layer publishing)
     audits/         # checklists/ + dated reports/
     changelogs/     # notable outcome records
     epic/           # YYYYMMDD-<slug>/ work units (spec, plan, tasks)
   ```

3. **Every document carries a header**: `Status (Active|Future|Historical) · Created · Source`,
   where *Source* names the `doc/` file(s) it was rewritten from (or `new`).
4. **Honesty invariant**: content was migrated by *rewriting against verified state*
   (code + the audited feature report), never by copying claims forward. Unimplemented
   requirements must be stated as such in a "Current status" section. A document that claims
   a capability the code lacks is a bug (see the maintenance rules in
   [../../prd/roadmap.md](../../prd/roadmap.md)).

### What was migrated (rewritten, with source attribution)

| From `doc/` | To `.context/` |
|---|---|
| `doc/adr/patterns/*.pattern.md` | `patterns/*.md` (e.g. [../../patterns/api-server.md](../../patterns/api-server.md), [../../patterns/layers.md](../../patterns/layers.md)) |
| `doc/prd/*.md` | `prd/*.md`, corrected against the audit |
| `doc/adr/saas.md` | [ADR-001](./ADR-001-nuxt-ui-dashboard-shell.md) |
| `doc/adr/saas-layer.md` | [ADR-002](./ADR-002-saas-meta-layer.md) |
| `doc/guides/*`, operational content | `operations/` |
| Planning content still relevant | `prd/roadmap.md` phases/epics + `epic/YYYYMMDD-<slug>/` dirs |

### What was discarded, and why

These were **not migrated**. Git history is the archive — every file remains retrievable at its
old path (`git log --follow -- 'doc/...'`); no `doc/archive/`-style graveyard is carried into
`.context/`.

| Discarded | Reason |
|---|---|
| `doc/analysis/gap-analysis-code-vs-prd.md` | Claimed "~95% Complete" per layer with A+ grades (e.g. i18n "~100%" while zero UI strings use i18n; storage "configuration exists" while no storage resource exists). Directly contradicted by code; superseded by the audited feature report that grounds `prd/roadmap.md`. |
| `doc/analysis/gap-analysis-code-vs-adr.md` | Claimed "98% overall architecture compliance" and listed "Nuxt UI Pro ✅"; the repo uses MIT @nuxt/ui v4 (ADR-001). Same drift failure mode. |
| `doc/plan/<layer>.md` (amplify, auth, billing, entitlements, i18n, saas, saas-layer, uix, workspaces) | Greenfield week-by-week build plans, long since executed or stale (some still say "Install @nuxt/ui-pro", "Create tRPC procedures"). Sequencing is now owned solely by `prd/roadmap.md`. |
| `doc/archive/plan/trpc.md`, `doc/archive/prd/trpc.md` (and the archived tRPC pattern) | tRPC was removed from the product; REST via Nitro routes is the standard ([../../patterns/api-server.md](../../patterns/api-server.md)). |
| `doc/archive/plan/global.md` | Point-in-time snapshot dated 2024-11-24 ("55-60% complete"); historical only. |
| `doc/archive/plan/notifications.md` | Archived greenfield phase plan for the unbuilt notifications layer (Notification model, `notify.ts`, `NotificationBell`/`NotificationList`, SES email channel, preference UI). Scope is fully owned by [`prd/notifications.md`](../../prd/notifications.md) (whose Source is `doc/archive/prd/notifications.md`) and roadmap epics E14/E04. |
| `doc/archive/plan/onboarding.md` | Archived greenfield phase plan for the unbuilt onboarding layer (wizard engine, `useOnboarding()`, `OnboardingWizard`/`StepIndicator`, middleware). Scope is fully owned by [`prd/onboarding.md`](../../prd/onboarding.md) (whose Source is `doc/archive/prd/onboarding.md`) and roadmap epic E15. |

Files not named above follow the same rule: migrated if still true, discarded if superseded —
recoverable from git history either way.

## Consequences

- One tree to read and one tree to keep honest; contributors and AI agents load `.context/`
  instead of a drifting `doc/` hierarchy.
- Provenance is explicit: the *Source* header field links every migrated document to its
  origin, and this ADR records the discard rationale, so nothing disappears silently.
- External references to `doc/**` paths (old issues, PRs, bookmarks) break; the git history
  escape hatch is the accepted mitigation.
- The honesty invariant adds friction by design: future docs claiming unverified capabilities
  should be rejected in review, and audits are re-run at phase boundaries
  (checklist under `.context/audits/`) to catch new drift.
