# F-86 / D-103 round 35 — Reversibility note

**Forward:** adds `createdByPersonId` + `updatedByPersonId` + FK + indexes on `M365DirectoryReconciliationRecord` and `RadiusReconciliationRecord`.

**Rollback:** drops four indexes, four FK constraints, four columns.

**Why this pair:** both are external-system reconciliation rows (M365 directory sync, Radius account sync). Admin resolves AMBIGUOUS/STALE_CONFLICT cases manually — "who resolved" is high-value observability for identity-flow audits.
