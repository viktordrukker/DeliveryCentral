#!/usr/bin/env bash
# ============================================================================
# DM-R-3 — Snapshot restore helper
# ============================================================================
# Restores a `.dump` file created by `db-snapshot.sh`. Uses `pg_restore
# --clean --if-exists` so re-applying a dump to a non-empty DB is safe.
#
# Destructive: wipes + replaces the target DB's schema and data. Requires
# interactive confirmation unless DB_RESTORE_FORCE=true is set.
#
# Usage:
#   ./scripts/db-restore.sh .snapshots/20260418T182800Z.pre-migrate.dump
# ============================================================================

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

DUMP="${1:?Usage: db-restore.sh <dump-file>}"
FORCE="${DB_RESTORE_FORCE:-false}"
ALLOW_PROD="${DB_RESTORE_ALLOW_PROD:-false}"

if [ ! -f "$DUMP" ]; then
  echo "❌ DM-R-3 restore: $DUMP does not exist." >&2
  exit 1
fi

# Mirror db-snapshot.sh prod guard.
if [ "$ALLOW_PROD" != "true" ]; then
  case "$DATABASE_URL" in
    *@localhost:*|*@127.0.0.1:*|*@postgres:*)
      : ;;
    *)
      echo "❌ DM-R-3 restore: DATABASE_URL does not look like a dev host." >&2
      echo "   Set DB_RESTORE_ALLOW_PROD=true to restore into a production DB." >&2
      exit 1
      ;;
  esac
fi

MASKED_URL=$(echo "$DATABASE_URL" | sed 's#//[^@]*@#//***@#')
echo "⚠️  DM-R-3 restore: this will CLEAN and REPLACE everything in:" >&2
echo "    $MASKED_URL" >&2
echo "    with the contents of:" >&2
echo "    $DUMP" >&2

if [ "$FORCE" != "true" ]; then
  printf "Type 'RESTORE' to confirm: " >&2
  read -r CONFIRM
  if [ "$CONFIRM" != "RESTORE" ]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🛠   DM-R-3 restore: running pg_restore..." >&2

# Always delegate to the postgres container — matches db-snapshot.sh.
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ DM-R-3 restore: 'docker' CLI not available on this host." >&2
  exit 1
fi

docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  pg_restore --clean --if-exists --no-owner --no-privileges \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-workload_tracking}" \
  < "$DUMP"

echo "✓ DM-R-3 restore: complete. Run 'npm run migrations:verify' to confirm." >&2
