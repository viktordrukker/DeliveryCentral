#!/usr/bin/env bash
# ============================================================================
# DM-R-25 — pg_basebackup helper.
# ============================================================================
# Weekly rolling base backup for continuous PITR. A base backup + WAL
# archive segments ≥ its stop-LSN is the full recovery set.
#
# Usage:
#   ./scripts/pg-basebackup.sh                 # writes .basebackups/<ts>/
#   BASEBACKUP_RETENTION_WEEKS=4 ./...         # override retention
#
# Written into .basebackups/ (gitignored). Restore via
# scripts/pg-pitr-restore.sh.
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_DIR="$REPO_ROOT/.basebackups"
RETENTION_WEEKS="${BASEBACKUP_RETENTION_WEEKS:-4}"

mkdir -p "$BASE_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BASE_DIR/$TS"

echo "📦 DM-R-25: writing base backup to $OUT" >&2

docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  pg_basebackup -U postgres -D /tmp/basebackup-$TS -F tar -z -P -X fetch -c fast

docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  tar -czf - -C /tmp basebackup-$TS > "$OUT.tar.gz"

docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  rm -rf /tmp/basebackup-$TS

BYTES=$(stat -c%s "$OUT.tar.gz" 2>/dev/null || stat -f%z "$OUT.tar.gz")
echo "✓ DM-R-25: base backup $BYTES bytes → $OUT.tar.gz" >&2

# Rotation — prune base backups older than N weeks.
if [ "$RETENTION_WEEKS" -gt 0 ] 2>/dev/null; then
  find "$BASE_DIR" -maxdepth 1 -type f -name '*.tar.gz' \
    -mtime "+$((RETENTION_WEEKS * 7))" -print -delete 2>/dev/null | \
    sed 's/^/🗑   pruned: /' >&2 || true
fi

echo "$OUT.tar.gz"
