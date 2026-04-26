#!/usr/bin/env bash
# ============================================================================
# DM-R-3 — Pre-migration snapshot helper
# ============================================================================
# Dumps the live DB into `.snapshots/<ISO-timestamp>.dump` via `pg_dump -Fc`
# (Postgres custom format — compact, restorable via pg_restore, supports
# parallel restore).
#
# Safety:
#   • Refuses to snapshot a prod-looking DATABASE_URL unless
#     DB_SNAPSHOT_ALLOW_PROD=true is set explicitly.
#   • Uses a 30-day rotation — snapshots older than 30 days are pruned to
#     keep disk usage bounded. Override with DB_SNAPSHOT_RETENTION_DAYS.
#
# Usage:
#   ./scripts/db-snapshot.sh              # creates .snapshots/<ts>.dump
#   ./scripts/db-snapshot.sh pre-migrate  # tags the snapshot with a label
# ============================================================================

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

ALLOW_PROD="${DB_SNAPSHOT_ALLOW_PROD:-false}"
RETENTION_DAYS="${DB_SNAPSHOT_RETENTION_DAYS:-30}"
LABEL="${1:-}"

# Reject prod-looking URLs unless explicitly opted in.
# Dev-safe hosts: localhost / 127.0.0.1 / postgres (docker service name).
if [ "$ALLOW_PROD" != "true" ]; then
  case "$DATABASE_URL" in
    *@localhost:*|*@127.0.0.1:*|*@postgres:*)
      : ;; # OK
    *)
      echo "❌ DM-R-3 snapshot: DATABASE_URL does not look like a dev host." >&2
      echo "   Got: $(echo "$DATABASE_URL" | sed 's#//[^@]*@#//***@#')" >&2
      echo "   Set DB_SNAPSHOT_ALLOW_PROD=true to snapshot a production DB." >&2
      exit 1
      ;;
  esac
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP_DIR="$REPO_ROOT/.snapshots"
mkdir -p "$SNAP_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
SUFFIX=""
if [ -n "$LABEL" ]; then
  SUFFIX=".${LABEL//[^A-Za-z0-9_-]/_}"
fi
DUMP_FILE="$SNAP_DIR/${TS}${SUFFIX}.dump"

echo "📦 DM-R-3 snapshot: dumping to $DUMP_FILE" >&2

# Execution strategy — always delegate to the postgres container via docker
# compose. This is the only reliable path: host-side pg_dump runs into
# password-auth pain, and the backend container does not have pg_dump. The
# postgres service has pg_dump + trust auth via `-U postgres` from localhost.
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ DM-R-3 snapshot: 'docker' CLI not available on this host." >&2
  echo "   Run this script from the host (not from inside a backend container)." >&2
  exit 1
fi

docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  pg_dump -Fc --no-owner --no-privileges \
  -U "${POSTGRES_USER:-postgres}" \
  "${POSTGRES_DB:-workload_tracking}" > "$DUMP_FILE"

# Guard: empty dump → something went wrong.
if [ ! -s "$DUMP_FILE" ]; then
  rm -f "$DUMP_FILE"
  echo "❌ DM-R-3 snapshot: dump is empty; removing." >&2
  exit 1
fi

BYTES=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
echo "✓ DM-R-3 snapshot: wrote $BYTES bytes" >&2

# Rotation — prune older dumps.
if [ "$RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
  find "$SNAP_DIR" -maxdepth 1 -type f -name "*.dump" -mtime "+$RETENTION_DAYS" -print -delete 2>/dev/null | \
    sed 's/^/🗑   pruned: /' >&2 || true
fi

echo "$DUMP_FILE"
