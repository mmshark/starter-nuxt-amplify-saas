# E28 — Design

> **Status**: Specified · **Created**: 2026-07-11

## Interface

Add a repository script under `scripts/init/` and expose it only through Taskfile contract tasks:

- `task init` — interactive when attached to a terminal;
- `task init -- --config path/to/init.json` — deterministic automation;
- `task init:check` — validation/no-write mode.

The script builds a change plan, validates all inputs, applies only allow-listed files and then runs
postconditions. It must not use broad repository search-and-replace.

## Allow-listed mutations

- root `saas.config.ts` values;
- application/root package names and workspace-safe identifiers explicitly owned by the template;
- `.env` creation when absent;
- optional instance marker used to detect repeated initialization.

Reusable layer package names and source files are immutable. Operator-owned cloud/Stripe values are
reported as follow-up actions.

## Failure behavior

Validate before writing, write atomically where practical and print a recovery summary. A dirty file
in the planned mutation set is a hard stop unless the user explicitly supplies a force flag; unrelated
dirty files do not block validation.
