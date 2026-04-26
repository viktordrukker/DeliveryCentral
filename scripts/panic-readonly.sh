#!/usr/bin/env bash
# ============================================================================
# DM-R-24 — PANIC: flip the DB read-only.
# ============================================================================
# Sets the database's default_transaction_read_only to on and terminates
# every non-admin connection so new queries can't write. Every subsequent
# connection from `app_runtime` defaults to read-only; writes fail with
# ERRCODE 25006 (read-only SQL transaction).
#
# Reversible with: scripts/panic-readwrite.sh
#
# Usage:
#   ./scripts/panic-readonly.sh
#
# Environment:
#   POSTGRES_PANIC_CONFIRM=true   — skip the interactive confirmation
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "" >&2
echo "⚠️  DM-R-24 PANIC READ-ONLY — flipping Postgres default_transaction_read_only=on." >&2
echo "   All app_runtime writes will start failing after this." >&2
echo "" >&2

if [ "${POSTGRES_PANIC_CONFIRM:-false}" != "true" ]; then
  printf "Type 'PANIC' to proceed: " >&2
  read -r CONFIRM
  if [ "$CONFIRM" != "PANIC" ]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  psql -U postgres -d workload_tracking -v ON_ERROR_STOP=1 -q <<'SQL'
ALTER DATABASE workload_tracking SET default_transaction_read_only = on;

-- Terminate every non-admin backend so new sessions start read-only.
SELECT pid, usename, application_name, state
  FROM pg_stat_activity
 WHERE datname = 'workload_tracking'
   AND usename NOT IN ('postgres', 'app_migrator');

-- Cut them.
SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
 WHERE datname = 'workload_tracking'
   AND usename NOT IN ('postgres', 'app_migrator')
   AND pid <> pg_backend_pid();
SQL

echo "" >&2
echo "✓ DM-R-24 PANIC READ-ONLY: DB is read-only. Operators have the control." >&2
echo "   Revert with: ./scripts/panic-readwrite.sh" >&2
