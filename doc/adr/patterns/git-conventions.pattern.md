# Pattern: Git Conventions (Conventional Commits)

## Context
A consistent commit history is vital for project maintainability, automated changelog generation, and semantic versioning. It allows developers and tools to understand the nature of changes at a glance.

## Problem
- **Messy History**: "Fixed bug", "Update", "WIP" commits make it impossible to track changes.
- **No SemVer**: Automated tools cannot determine if a release is a patch, minor, or major version.
- **Hard to Review**: Reviewers struggle to understand the *intent* of a commit.

## Solution
Adhere to the **Conventional Commits** specification. This provides a lightweight convention on top of commit messages, creating an explicit commit history.

## Pattern Details

### Format
```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

- **Header**: Max 72 characters. No period at the end. Imperative mood ("add" not "added").
- **Body**: Motivation for the change and contrast with previous behavior.
- **Footer**: Breaking changes, issue references (e.g., "Closes #123").

### Commit Types

| Type | Description | SemVer Impact | Example |
| :--- | :--- | :--- | :--- |
| **feat** | A new feature | `MINOR` | `feat(auth): add google login support` |
| **fix** | A bug fix | `PATCH` | `fix(billing): correct invoice calculation` |
| **refactor** | Code change that neither fixes a bug nor adds a feature | `PATCH` | `refactor(uix): simplify button component logic` |
| **chore** | Maintenance tasks, dependency updates, build scripts | `PATCH` | `chore(deps): update nuxt to 4.1.0` |
| **docs** | Documentation only changes | `PATCH` | `docs(readme): update installation steps` |
| **test** | Adding missing tests or correcting existing tests | `PATCH` | `test(auth): add unit tests for user composable` |
| **style** | Changes that do not affect the meaning of the code (white-space, formatting) | `PATCH` | `style(lint): fix eslint errors` |
| **perf** | A code change that improves performance | `PATCH` | `perf(core): optimize image loading` |
| **ci** | Changes to CI configuration files and scripts | `PATCH` | `ci(github): add deploy workflow` |
| **revert** | Reverts a previous commit | `PATCH` | `revert: feat(auth): add google login support` |

### Breaking Changes
Any commit that introduces a breaking change **MUST** include `BREAKING CHANGE:` in the footer or append `!` after the type/scope. This triggers a `MAJOR` version bump.

**Example:**
```text
feat(auth)!: remove support for v1 login API

BREAKING CHANGE: The v1 login API has been removed. Use v2 instead.
```

### Branch Naming
Branches must follow the format: `<type>/<description-kebab-case>`

| Type | Use Case | Example |
| :--- | :--- | :--- |
| **feat** | New features | `feat/user-profile-page` |
| **fix** | Bug fixes | `fix/billing-calculation` |
| **refactor** | Code restructuring | `refactor/auth-composable` |
| **chore** | Maintenance/Config | `chore/update-deps` |
| **docs** | Documentation | `docs/update-readme` |

### Pull Request Guidelines
1.  **Title**: Must follow the Conventional Commits format (e.g., `feat(auth): add google login`). This title will become the squash commit message.
2.  **Strategy**: Use **Squash & Merge**. This keeps the main history clean, containing only one commit per feature/fix.
3.  **Atomic**: PRs should focus on a single logical change.

### AI Agents Policy
- **No Co-authors**: AI Agents (e.g., GitHub Copilot, Claude, ChatGPT) must **NEVER** be listed as co-authors in commit messages. The human developer reviewing and applying the code is the sole author and the only responsible party.
