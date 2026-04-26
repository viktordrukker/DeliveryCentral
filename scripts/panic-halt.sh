#!/usr/bin/env bash
# ============================================================================
# DM-R-24 — PANIC HALT: stop the world.
# ============================================================================
# Deepest-cut panic: stops the backend container, revokes app_runtime
# grants (so even if the container restarts it cannot touch data), and
# terminates every non-admin DB connection.
#
# Recover via:
#   1. Diagnose (ddl_audit, DRIFT_EVENTs, /api/health/deep on a clean
#      Postgres instance).
#   2. Optional — restore from a known-good snapshot (db-last-good.sh).
#   3. Restore grants:
#      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
#      (or re-apply 20260418_dm_r_20_role_separation)
#   4. Restart backend:  docker compose up -d backend
#
# Usage:
#   POSTGRES_PANIC_CONFIRM=true ./scripts/panic-halt.sh   # skip confirm
#   ./scripts/panic-halt.sh                                # interactive
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "" >&2
echo "🛑 DM-R-24 PANIC HALT — stopping backend, revoking app_runtime, killing sessions." >&2
echo "   This is the deepest-cut recovery option." >&2
echo "" >&2

if [ "${POSTGRES_PANIC_CONFIRM:-false}" != "true" ]; then
  printf "Type 'HALT' to proceed: " >&2
  read -r CONFIRM
  if [ "$CONFIRM" != "HALT" ]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

echo "→ stopping backend container..." >&2
docker compose -f "$REPO_ROOT/docker-compose.yml" stop backend || true

echo "→ revoking app_runtime grants..." >&2
docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  psql -U postgres -d workload_tracking -v ON_ERROR_STOP=1 -q <<'SQL'
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM app_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM app_runtime;
REVOKE USAGE                 ON SCHEMA public FROM app_runtime;
SQL

echo "→ terminating all non-admin sessions..." >&2
docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  psql -U postgres -d workload_tracking -v ON_ERROR_STOP=1 -c "
SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
 WHERE datname = 'workload_tracking'
   AND usename NOT IN ('postgres', 'app_migrator')
   AND pid <> pg_backend_pid();"

echo "" >&2
echo "✓ DM-R-24 PANIC HALT complete." >&2
echo "  Runbook for recovery: docs/runbooks/panic.md" >&2
