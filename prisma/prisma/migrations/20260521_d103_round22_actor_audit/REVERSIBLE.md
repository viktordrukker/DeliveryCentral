# REVERSIBLE — 20260521_d103_round22_actor_audit

Forward: adds nullable `createdByPersonId` + `updatedByPersonId` UUID columns
(FK → Person ON DELETE SET NULL) + covering indexes on
`person_release_approvals` and `staffing_request_fulfilments`.

Rollback: pure DDL drops via `rollback.sql`. Both audit columns are nullable
and empty for legacy rows, so no data is destroyed beyond column metadata.
