# FORWARD_ONLY

**Posture:** This migration is **FORWARD_ONLY**. It reverts 5 enum
promotions that mis-matched the values written by existing application
code. There's no clean rollback because "re-promote" would require
us to re-invent the enum labels — the whole point of reverting is
that we don't yet know the right labels.

## How to restore after a bad deploy

Recovery goes through a pre-migration snapshot.

```bash
./scripts/db-snapshot.sh pre-enum-revert
./scripts/db-migrate-safe.sh deploy
# If it turns out bad:
./scripts/db-restore.sh .snapshots/<ts>.pre-enum-revert.dump
```

## Why forward-only

Re-applying the earlier enum promotions (batch 2 + batch 4) is the
right path forward *after* product has codified the canonical label
set for each of these 5 fields. Until then, `text` matches the
pre-promotion reality.

See [docs/planning/MASTER_TRACKER.md](../../docs/planning/MASTER_TRACKER.md)
Phase DM row for the follow-up item.
