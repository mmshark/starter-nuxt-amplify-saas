---
epic: 20260708-green-ci
---

# Design — `amplify_outputs.json` strategy for CI


## Problem

Three files import `amplify_outputs.json` **statically, at module scope**:

| File | Import | Module-scope use |
|---|---|---|
| `layers/amplify/plugins/01.amplify.client.ts:5` | `import outputs from '../amplify_outputs.json'` | passed to `Amplify.configure()` when the plugin runs |
| `layers/amplify/plugins/01.amplify.server.ts:28` | `import outputs from '../amplify_outputs.json'` | parsed at import time |
| `layers/amplify/server/utils/amplify.ts:14` | `import outputs from '../../amplify_outputs.json'` | `parseAmplifyConfig(outputs)` **executes at import time** and `amplifyConfig.Auth!.Cognito.userPoolClientId` is dereferenced at module scope (L17–21) |

The file is generated per environment by `ampx generate outputs`
(`apps/backend/package.json:20`, `sandbox:generate-outputs`) and is gitignored everywhere
(root `.gitignore:32`, `apps/backend/.gitignore:4`, `layers/amplify/.gitignore`). Consequence:
on any clean checkout, typecheck fails (TS2307 + cascades → 341 errors) and `nuxt build` /
`nuxt generate` would fail at the same imports. CI can never be green without a strategy for
this file.

## Constraints

1. **No AWS credentials in the default CI job** (spec AC7). A public starter must run CI on
   forks/PRs where secrets are unavailable.
2. CI never *runs* the apps against AWS — it only lints, typechecks, builds and prerenders. But
   `nuxt generate` for `apps/landing` executes the Nitro server plugins during prerender, so the
   config must be **structurally valid**, not just present (module-scope `Auth!.Cognito.…`
   dereference above).
3. The real `amplify_outputs.json` must remain gitignored — committing a live one leaks
   environment identifiers and rots instantly.
4. E01 is a stabilization epic: minimize changes to auth-critical plumbing
   (`layers/amplify/**` is load-bearing for every SSR request's Cognito token handling).

## Options

### (a) Committed CI stub outputs file

Commit a schema-valid, obviously-fake `layers/amplify/amplify_outputs.stub.json`; a one-line
copy step (`cp` in CI, `pnpm run amplify:outputs:stub` locally) puts it at the gitignored real
path before install/build.

- **Pros**: zero AWS involvement; deterministic; no source-code changes to the amplify layer;
  same mechanism serves local clean checkouts (contributors without a sandbox can typecheck);
  works for fork PRs.
- **Cons**: stub must track the outputs schema shape whenever backend resources grow (adding
  Storage later means extending the stub); a stub-built artifact must never be deployed
  (mitigated: deploys generate real outputs via `amplify.yml` preBuild, and the stub values are
  unmistakably fake).

### (b) Lazy/dynamic import with runtime-config fallback

Refactor the three files to stop importing the JSON statically: read config from
`useRuntimeConfig()` / env, fall back to a bundled default, type against `ResourceConfig`.

- **Pros**: fixes the *architectural* coupling, not just CI; enables per-environment config
  without rebuild; unblocks building `apps/landing` truly backend-free.
- **Cons**: invasive rewrite of module-scope logic in the auth/SSR hot path (cookie key
  derivation from `userPoolClientId` at import time, `runWithAmplifyServerContext` wiring);
  regression risk across every layer for a Phase 0 epic whose job is to *stabilize*; Nuxt plugins
  and Nitro utils would need different injection mechanisms; still needs *some* config source in
  CI, so it does not remove the stub — it only relocates it.

### (c) Generate outputs in CI against a real sandbox

Run `ampx generate outputs --branch … --app-id …` (or keep a deployed sandbox) in the workflow.

- **Pros**: the exact artifact production uses; would also unblock e2e in CI someday.
- **Cons**: requires AWS credentials + a permanently deployed backend — violates constraint 1;
  fork PRs cannot access secrets, so the check would be dead for external contributions; CI
  green-ness becomes coupled to live infrastructure availability and cost; slowest option.

## Decision

**Option (a): committed stub, copied into place by CI and by a root helper script.**

Rationale: it is the only option satisfying "no AWS credentials" while requiring zero changes to
auth-critical runtime code. Option (c) is disqualified by constraint 1. Option (b) is the better
*architecture* but the wrong *epic*: its blast radius contradicts Phase 0's stabilization goal,
and it still needs a stub-equivalent config in CI anyway. Revisit (b) if/when multi-environment
runtime config becomes a requirement — record it in
[../../architecture/tech-debt.md](../../architecture/tech-debt.md) rather than half-doing it here.

### Implementation notes

- **Stub location**: `layers/amplify/amplify_outputs.stub.json` (next to its consumers).
  Requires un-ignoring: add `!amplify_outputs.stub.json` after the `amplify_outputs*` patterns in
  root `.gitignore` and `layers/amplify/.gitignore` (`apps/backend/.gitignore` untouched — no stub
  lives there).
- **Minimum required fields** (what the code dereferences at module scope / configure time):
  `version`; `auth.aws_region`, `auth.user_pool_id`, `auth.user_pool_client_id`,
  `auth.identity_pool_id`; `data.aws_region`, `data.url`, `data.api_key`,
  `data.default_authorization_type`, `data.authorization_types`. Values must be
  **syntactically plausible but unmistakably fake** (e.g. `us-east-1_STUB00000`,
  `https://stub.appsync-api.us-east-1.amazonaws.com/graphql`) so a stub-configured build that
  accidentally reaches runtime fails loudly on first network call instead of hitting a real
  environment.
- **Copy step placement**: in `ci.yml`, copy **before** `pnpm install` — the apps'
  `postinstall: nuxt prepare` loads every layer's `nuxt.config.ts`, and copying first keeps the
  install step independent of import-graph changes.
- **Helper script**: root `package.json` script
  `"amplify:outputs:stub": "cp layers/amplify/amplify_outputs.stub.json layers/amplify/amplify_outputs.json"` —
  one command for CI and for contributors without a sandbox. The copy target stays gitignored
  (spec AC8), so the stub can never be committed at the real path by accident.

## Consequences

- CI validates *compile-time* correctness only; nothing in CI proves the app works against real
  AWS. That remains the job of the local sandbox flow and (later, E11) an e2e stage.
- Whenever backend resources are added (e.g. Storage in E07), the author must extend the stub in
  the same PR or typecheck/build will catch the missing section — which is the desired failure mode.
- The `amplify_outputs*` gitignore pattern now has one negated exception; tooling that globs for
  outputs files must not treat the stub as a real environment file (its name and values make the
  distinction explicit).
