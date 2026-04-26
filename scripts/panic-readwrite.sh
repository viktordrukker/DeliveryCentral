#!/usr/bin/env bash
# ============================================================================
# DM-R-24 — revert panic-readonly.
# ============================================================================
# Undoes scripts/panic-readonly.sh — removes default_transaction_read_only.
# Does NOT terminate connections (readers may still be serving while writes
# were blocked; leave them alone).
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ "${POSTGRES_PANIC_CONFIRM:-false}" != "true" ]; then
  printf "Type 'RESUME' to re-enable writes: " >&2
  read -r CONFIRM
  if [ "$CONFIRM" != "RESUME" ]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  psql -U postgres -d workload_tracking -v ON_ERROR_STOP=1 <<'SQL'
-- Our own session inherits the read-only default; flip it off first so
-- we can issue the ALTER DATABASE.
SET default_transaction_read_only = off;
ALTER DATABASE workload_tracking RESET default_transaction_read_only;
SQL

echo "✓ DM-R-24: writes re-enabled. Verify with /api/health/deep before resuming traffic." >&2
