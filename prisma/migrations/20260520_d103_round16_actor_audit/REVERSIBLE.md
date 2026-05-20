# REVERSIBLE — 20260520_d103_round16_actor_audit

Forward: adds nullable `createdByPersonId` + `updatedByPersonId` UUID columns
(FK → Person ON DELETE SET NULL) + covering indexes on `rate_card_entries`
and `leave_balances`.

Rollback: pure DDL drops via `rollback.sql`. Both audit columns are nullable
and empty for legacy rows, so no data is destroyed beyond column metadata.
