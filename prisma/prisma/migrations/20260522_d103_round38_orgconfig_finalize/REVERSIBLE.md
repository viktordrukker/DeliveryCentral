# F-89 / D-103 round 38 — Reversibility note

**Final D-103 closeout.** Single-aggregate round: adds `createdByPersonId` to `organization_configs` (the singleton tenant config row). It already carries `updatedByPersonId` + `updatedAt`; this completes the canonical pair.

**Rollback:** drops one index, one FK constraint, one column.

**Why single-aggregate:** the 25 remaining un-audited aggregates were inventoried in MASTER_TRACKER's D-103 entry with per-row rationale (already-actored / auth-internal / NO_TS / DB-trigger / Person-deferred). This is the last completable item without requiring schema-prep refactors or central-aggregate single-PR sprints.
