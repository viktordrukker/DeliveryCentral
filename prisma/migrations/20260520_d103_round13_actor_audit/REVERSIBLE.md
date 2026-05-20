# REVERSIBLE — 20260520_d103_round13_actor_audit

Forward: adds nullable `createdByPersonId` + `updatedByPersonId` UUID columns
(FK → Person ON DELETE SET NULL) + covering indexes on `help_articles` and
`project_vendor_engagements`.

Rollback: pure DDL drops via `rollback.sql`. Both audit columns are nullable
and empty for legacy rows, so no data is destroyed beyond column metadata.
