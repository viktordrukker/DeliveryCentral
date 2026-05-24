# Reversible migration

Pure additive — creates a new enum (`DigestSchedule`) and a new table
(`person_notification_digest`). No data in existing tables is touched.

Rollback: drop the table + enum. See `rollback.sql`.

Backfill consideration: rows are created on first user PATCH; an absent
row means "defaults" (IMMEDIATE digest, no quiet hours). So no data is
lost when rolled back — users just revert to defaults until the table
is re-introduced.
