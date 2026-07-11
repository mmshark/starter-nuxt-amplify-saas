---
epic: 20260711-saas-project-initializer
---

# E28 — Implementation plan

The executable work queue is maintained in [tasks.md](./tasks.md).


1. Inventory the exact instance-owned identifiers and define the initializer input schema.
2. Implement dry-run planning, allow-listed mutations and idempotency marker.
3. Add Taskfile entry points and deterministic fixture tests.
4. Integrate env preparation and post-run validation.
5. Rewrite the make-it-yours runbook around the automated happy path and explicit cloud follow-ups.
6. Verify two-run idempotency and offline CI from a disposable initialized checkout.
