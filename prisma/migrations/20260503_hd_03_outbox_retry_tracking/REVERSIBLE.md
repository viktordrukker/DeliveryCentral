# REVERSIBLE

**Posture:** REVERSIBLE. Sibling `rollback.sql` drops the two columns
(`attempts`, `lastError`) the forward migration adds.

## What this migration adds

* `OutboxEvent.attempts INTEGER NOT NULL DEFAULT 0` — dispatch attempts
  counter. Incremented by `OutboxEventPublisherService` on each handler
  failure; capped by the `outbox.maxAttempts` PlatformSetting (default 5).
  On cap, the row flips to `status='FAILED'` and stops being polled.
* `OutboxEvent.lastError TEXT NULL` — most recent failure message,
  stored so an operator can triage stuck rows without grepping logs.

Both are pure additions; no existing data is touched. Existing rows
default to `attempts=0` and `lastError=NULL`.

## Rollback impact

* Retry bookkeeping is lost on rolled-back rows.
* The `OutboxEventPublisherService` will fail at boot if the columns
  are missing while the application code expects them — schedule a code
  rollback alongside any DB rollback.
