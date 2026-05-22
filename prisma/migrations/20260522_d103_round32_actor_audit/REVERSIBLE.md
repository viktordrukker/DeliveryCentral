# F-83 / D-103 round 32 — Reversibility note

**Forward:** adds `createdByPersonId` + `updatedByPersonId` + FK + indexes on `project_rag_snapshots` (ProjectRagSnapshot) and `CaseStep`.

**Rollback:** drops four indexes, four FK constraints, four columns.

**Why this pair:**
- ProjectRagSnapshot already has `recordedByPersonId` (the recorder semantic — distinct from the canonical "who created/last-edited the row").
- CaseStep holds workflow-step state on each case (admin reassigns, retries; PM/RM transitions). Canonical pair lets observability answer "who last edited this step" without case-event scanning.

The mapped table `project_rag_snapshots` follows the same snake_case-prefix convention as F-78's `help_tips` and F-82's `onboarding_tour_progress`.
