# REVERSIBLE — 20260521_d103_round23_actor_audit

Forward: asymmetric per-aggregate additions.
- `radiator_threshold_configs` already has `updatedByPersonId` + `updatedAt`
  from PR-v1 work. Adds the missing canonical `createdByPersonId` + FK +
  index. (The table never had a `createdAt` column; the existing
  `updatedAt` doubles as "last write" without a true lifecycle pair.)
- `skills` was missing `updatedAt` entirely. Adds `updatedAt`
  (`TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()` so legacy rows backfill to
  install-time) plus the canonical `createdByPersonId` /
  `updatedByPersonId` pair + FKs + indexes.

Rollback: pure DDL drops via `rollback.sql`. The newly-added `updatedAt`
column on `skills` is also dropped — re-running forward backfills via
`DEFAULT NOW()`.
