# REVERSIBLE — 20260521_d103_round24_actor_audit

Forward: adds nullable `createdByPersonId` + `updatedByPersonId` UUID columns
(FK → Person ON DELETE SET NULL) + covering indexes on `staffing_requests`.

Single-aggregate round (not the usual pair). StaffingRequest is central
enough to warrant focused scope.

Rollback: pure DDL drops via `rollback.sql`. Both audit columns are nullable
and empty for legacy rows, so no data is destroyed beyond column metadata.
