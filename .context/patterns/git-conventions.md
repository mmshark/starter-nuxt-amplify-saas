# Git Conventions (Conventional Commits)

> **Status**: Active · **Created**: 2026-07-08 · **Source**: doc/adr/patterns/git-conventions.pattern.md

**MUST-follow pattern for all contributors.** A consistent history enables changelog generation, semantic versioning, and reviewable intent. This repo follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Commit format

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

- **Header**: max 72 characters, no trailing period, imperative mood ("add", not "added").
- **Scope**: optional but preferred; use a project scope from the list below.
- **Body**: motivation for the change and contrast with previous behavior.
- **Footer**: breaking changes, issue references (e.g. `Closes #123`).

## Commit types

| Type | Description | SemVer impact | Example |
| :--- | :--- | :--- | :--- |
| **feat** | New feature | `MINOR` | `feat(auth): add google login support` |
| **fix** | Bug fix | `PATCH` | `fix(billing): correct invoice calculation` |
| **refactor** | Code change that neither fixes a bug nor adds a feature | `PATCH` | `refactor(uix): simplify button component logic` |
| **chore** | Maintenance, dependency updates, build scripts | `PATCH` | `chore(deps): bump stripe to v18` |
| **docs** | Documentation-only changes | `PATCH` | `docs: correct package names and stale references` |
| **test** | Adding or correcting tests | `PATCH` | `test(auth): add unit tests for user composable` |
| **style** | Formatting/whitespace, no meaning change | `PATCH` | `style(uix): fix formatting in button components` |
| **perf** | Performance improvement | `PATCH` | `perf(saas): optimize image loading` |
| **ci** | CI configuration and scripts | `PATCH` | `ci: add publish-on-tag workflow` |
| **revert** | Reverts a previous commit | `PATCH` | `revert: feat(auth): add google login support` |

## Project scopes

Per `AGENTS.md` (Contribution Standards → Git Conventions):

`billing` · `auth` · `i18n` · `saas` · `amplify` · `uix` · `workspaces` · `entitlements` · `debug` · `deps` · `docs`

Most scopes map 1:1 to directories under `layers/` (`amplify`, `auth`, `billing`, `debug`, `entitlements`, `i18n`, `saas`, `uix`, `workspaces`). Scope is omitted for cross-cutting changes (e.g. `docs: …`, `test: …`).

## Breaking changes

A breaking change **MUST** append `!` after the type/scope or include a `BREAKING CHANGE:` footer. Either triggers a `MAJOR` bump.

```text
feat(auth)!: remove support for v1 login API

BREAKING CHANGE: The v1 login API has been removed. Use v2 instead.
```

## Branch naming

Format: `<type>/<description-kebab-case>` (e.g. the current remediation branch `fix/remediation-2026-07-07`).

| Type | Use case | Example |
| :--- | :--- | :--- |
| **feat** | New features | `feat/user-profile-page` |
| **fix** | Bug fixes | `fix/billing-calculation` |
| **refactor** | Code restructuring | `refactor/auth-composable` |
| **chore** | Maintenance/config | `chore/update-deps` |
| **docs** | Documentation | `docs/update-readme` |

## Pull requests

1. **Title** follows the Conventional Commits format — it becomes the squash commit message.
2. **Strategy**: Squash & Merge, one commit per feature/fix on `master`.
3. **Atomic**: one logical change per PR; update relevant READMEs when changing layer APIs (see `AGENTS.md`).

## AI agents policy

AI agents (Claude, Copilot, ChatGPT, etc.) must **NEVER** appear as co-authors in commit messages. The human who reviews and applies the code is the sole author and responsible party.

## Current status

- **Not enforced by tooling.** There is no commitlint, husky hook, or CI check validating commit messages or branch names — adherence relies on code review.
- Recent history (`git log`) follows the convention; some older commits and remote branches (`refactor-prds`, `subscription`, `app-layout`, `plans`) and legacy scopes (`layers`, `dx`, `trpc`, `security`, `navigation`, `backend`) predate the current scope list.
- Apps `backend` and `landing` exist but are not in the `AGENTS.md` scope list; history has used `fix(backend): …`. If a change is app-specific and no listed scope fits, prefer extending the list in `AGENTS.md` over inventing ad-hoc scopes.
