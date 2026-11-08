# F-88 / D-103 round 37 — Reversibility note

**Bundle pattern continued (after F-87):** 5 more immutable-row aggregates (`createdAt` only) get `createdByPersonId` + FK + index.

**Aggregates:**
1. `CaseParticipant` — admin/PM adds a person to a case
2. `OutboxEvent` — service producer / request principal
3. `WorkEvidenceLink` — admin attaches external evidence link
4. `in_app_notifications` (InAppNotification) — system broadcasts (recipient `personId` is distinct from creator)
5. `fiscal_periods` (FiscalPeriod) — admin-derived from FiscalCalendar setup

**Skipped from this round** (auth-internal, no human creator):
- RefreshToken — issued by login flow; subject is the LocalAccount itself
- PasswordResetToken — issued by reset flow; subject is the LocalAccount itself

**Rollback:** drops 5 indexes, 5 FK constraints, 5 columns.
