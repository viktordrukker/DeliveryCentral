# F-44 / D-103 + DM-5-5 round 12 — actor-audit on ProjectChangeRequest + ProjectActivationApproval

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → Person, SET NULL) to both project-governance approval aggregates. After this batch, **24/105** aggregates carry the canonical actor-audit columns.

Both aggregates already have business actors (requester/requestedBy + decidedBy). The canonical pair brings them into uniform shape for join-by-actor queries across all audit-grade aggregates.

Rollback drops all 4 added columns + 4 FKs + 4 indexes. Idempotent.
