# E27 — Implementation plan

> **Status**: Specified · **Created**: 2026-07-11

1. Add adapter APIs and equivalence fixtures without switching consumers.
2. Adopt public/frontend projections while preserving app-owned navigation and layout arrays.
3. Adopt i18n and entitlement projections; remove dead duplicate catalogs.
4. Adopt backend billing/auth projections and retain provider secret/ID boundaries.
5. Remove obsolete config keys/files, update patterns/operations docs and run CI plus backend synthesis.

Each migration phase must leave the repository green and can be reverted independently.
