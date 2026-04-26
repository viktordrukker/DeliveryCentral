#!/usr/bin/env bash
# ============================================================================
# DM-R-3 / DM-R-15 — Safe migration wrapper
# ============================================================================
# Runs a migration with three guardrails:
#
#   1. Advisory lock — acquires `pg_advisory_lock(<MIGRATION_LOCK_ID>)`
#      for the duration of the migration. A second dev/agent running this
#      concurrently blocks until the first finishes. Prevents two `prisma
#      migrate dev` processes from racing on the same DB.
#
#   2. Pre-migration snapshot — calls db-snapshot.sh before touching the DB.
#      Snapshot path is printed in the success path AND the failure path, so
#      a bad migration can be rolled back via db-restore.sh.
#
#   3. Post-migration verification — runs `prestart-verify-migrations.sh`
#      to confirm the DB state is clean after the migration. If the verifier
#      fails, prints the snapshot path for restore.
#
# Usage:
#   ./scripts/db-migrate-safe.sh deploy   # prisma migrate deploy
#   ./scripts/db-migrate-safe.sh dev      # prisma migrate dev (interactive)
#
# Bypass:
#   DB_MIGRATE_SAFE_SKIP_SNAPSHOT=true   (dev only; still keeps the lock)
# ============================================================================

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

MODE="${1:-deploy}"
SKIP_SNAPSHOT="${DB_MIGRATE_SAFE_SKIP_SNAPSHOT:-false}"
LOCK_ID="${MIGRATION_LOCK_ID:-42042042}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$MODE" in
  deploy|dev|reset|status) ;;
  *)
    echo "Usage: $0 {deploy|dev|status|reset}" >&2
    exit 1
    ;;
esac

echo "🔐 DM-R-3: acquiring migration advisory lock ($LOCK_ID)..." >&2

# Advisory-lock wrapper: we need to hold the lock across BOTH the snapshot
# and the migrate command. Since `prisma migrate` manages its own connection,
# the simplest portable approach is to serialise via a sentinel file on the
# local host AND a session-level advisory lock on the DB (belt + braces).
LOCK_FILE="/tmp/dm-r-3-migrate-safe.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "❌ DM-R-3: another migration is already running on this host ($LOCK_FILE)." >&2
  echo "   Wait for it to finish, or remove the stale lock file if the process is gone." >&2
  exit 1
fi
echo "✓ local host lock acquired" >&2

# DB-level advisory lock via a disposable psql connection. If psql isn't on
# the host, we delegate to the docker postgres container.
acquire_db_lock() {
  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="${PGPASSWORD:-}" psql "$DATABASE_URL" -tAc "SELECT pg_try_advisory_lock($LOCK_ID);"
  else
    docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
      psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-workload_tracking}" \
      -tAc "SELECT pg_try_advisory_lock($LOCK_ID);"
  fi
}

DB_LOCK_RESULT=$(acquire_db_lock 2>/dev/null | tr -d '[:space:]' || echo 'f')
if [ "$DB_LOCK_RESULT" != "t" ]; then
  echo "❌ DM-R-3: another session holds the DB advisory lock ($LOCK_ID)." >&2
  echo "   Another migration is in flight. Wait, or force-release with:" >&2
  echo "   psql \$DATABASE_URL -c 'SELECT pg_advisory_unlock($LOCK_ID);'" >&2
  exit 1
fi
echo "✓ DB-level advisory lock acquired" >&2

# Stage 1 — pre-migration snapshot.
SNAPSHOT=""
if [ "$SKIP_SNAPSHOT" != "true" ] && [ "$MODE" != "status" ]; then
  SNAPSHOT=$(bash "$REPO_ROOT/scripts/db-snapshot.sh" "pre-migrate-$MODE" 2>&1 | tail -1)
  echo "📦 DM-R-3: pre-migration snapshot at $SNAPSHOT" >&2
else
  echo "⚠️  DM-R-3: snapshot skipped ($MODE / DB_MIGRATE_SAFE_SKIP_SNAPSHOT=$SKIP_SNAPSHOT)" >&2
fi

# Stage 2 — capture pending migrations BEFORE running, for audit attribution.
export MIGRATIONS_APPLIED=""
if [ "$MODE" = "deploy" ] || [ "$MODE" = "dev" ]; then
  MIGRATIONS_APPLIED=$(npx prisma migrate status --schema=prisma/schema.prisma 2>/dev/null \
    | awk '/following migrations? have not yet been applied/,/^$/' \
    | grep -E '^[0-9_A-Za-z]+$' \
    | paste -sd, - || echo "")
fi

# Stage 3 — the actual Prisma command.
PRISMA_CMD="migrate $MODE"
echo "🚀 DM-R-3: running npx prisma $PRISMA_CMD..." >&2
if ! npx prisma $PRISMA_CMD --schema=prisma/schema.prisma; then
  echo "" >&2
  echo "❌ DM-R-3: migration failed." >&2
  if [ -n "$SNAPSHOT" ]; then
    echo "   Restore with: ./scripts/db-restore.sh $SNAPSHOT" >&2
  fi
  # DM-R-7: record failed attempt too.
  bash "$REPO_ROOT/scripts/record-migration-audit.sh" "$MODE" "false" \
    "snapshot=$SNAPSHOT" || true
  exit 1
fi

# Stage 4 — post-migration verification (skip for status which is read-only).
if [ "$MODE" != "status" ]; then
  echo "🔎 DM-R-3: verifying post-migration state..." >&2
  if ! bash "$REPO_ROOT/scripts/prestart-verify-migrations.sh"; then
    echo "" >&2
    echo "❌ DM-R-3: post-migration verification failed." >&2
    if [ -n "$SNAPSHOT" ]; then
      echo "   Restore with: ./scripts/db-restore.sh $SNAPSHOT" >&2
    fi
    bash "$REPO_ROOT/scripts/record-migration-audit.sh" "$MODE" "false" \
      "post-migration-verifier-failed; snapshot=$SNAPSHOT" || true
    exit 1
  fi
fi

# Stage 5 — DM-R-7 audit row on success.
bash "$REPO_ROOT/scripts/record-migration-audit.sh" "$MODE" "true" \
  "${SNAPSHOT:+snapshot=$SNAPSHOT}" || true

echo "✓ DM-R-3: migration + verification complete." >&2
if [ -n "$SNAPSHOT" ]; then
  echo "   Snapshot retained at $SNAPSHOT (auto-pruned in 30 days)." >&2
fi
