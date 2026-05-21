# F-82 / D-103 round 31 — Reversibility note

**Forward:** adds `createdByPersonId` + `updatedByPersonId` + FK + indexes on `OnboardingTourProgress` and `WorkEvidenceSource`.

**Rollback:** drops four indexes, four FK constraints, four columns.

**Why this pair:** OnboardingTourProgress tracks per-person tour state (admin/HR can reset); WorkEvidenceSource registers ingest connectors (Jira/M365/GitHub) — admin-edited per-tenant. Both edit surfaces want canonical actor-audit observability.
