# F-80 / D-103 round 30 — Reversibility note

**Forward:** `migration.sql` adds `createdByPersonId` + `updatedByPersonId` (nullable, FK to `Person` with `ON DELETE SET NULL`) plus two indexes to `NotificationRequest` and `NotificationChannel`.

**Rollback:** drops the four indexes, four FK constraints, and four columns.

**Why this pair:** NotificationChannel is per-tenant config that admin edits (kind, enabled, channel-specific config blob); NotificationRequest is the dispatch queue (mostly system-written via outbox but admin can inject ad-hoc in dev/QA). The canonical actor-audit pair brings them into uniform observability shape.
