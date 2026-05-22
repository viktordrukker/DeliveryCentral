# F-84 / D-103 round 33 — Reversibility note

**Forward:** adds `createdByPersonId` + `updatedByPersonId` + FK + indexes on `NotificationDelivery` and `fiscal_calendars` (FiscalCalendar).

**Rollback:** drops four indexes, four FK constraints, four columns.

**Why this pair:** NotificationDelivery is a per-attempt audit row; while mostly system-written via outbox, admin/QA can inject rows so canonical actor-audit closes the observability gap. FiscalCalendar is admin-curated per-tenant FY-boundary config (multi-region tenants override via regionCode). Both want uniform actor-audit shape.
