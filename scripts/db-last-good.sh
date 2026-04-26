#!/usr/bin/env bash
# ============================================================================
# DM-R-24 — restore to the most recent pre-migration snapshot.
# ============================================================================
# Wraps db-restore.sh with automatic selection of the latest
# .snapshots/*.pre-migrate-*.dump file.
#
# Usage:
#   ./scripts/db-last-good.sh                 # restore newest snapshot
#   ./scripts/db-last-good.sh 3               # restore 3rd-newest (escape newer ones)
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP_DIR="$REPO_ROOT/.snapshots"
INDEX="${1:-1}"

if [ ! -d "$SNAP_DIR" ]; then
  echo "❌ DM-R-24: $SNAP_DIR does not exist. No snapshots to restore." >&2
  exit 1
fi

mapfile -t SNAPS < <(ls -1t "$SNAP_DIR"/*.dump 2>/dev/null || true)
if [ "${#SNAPS[@]}" -eq 0 ]; then
  echo "❌ DM-R-24: no .dump files under $SNAP_DIR." >&2
  exit 1
fi

if [ "$INDEX" -le 0 ] || [ "$INDEX" -gt "${#SNAPS[@]}" ]; then
  echo "❌ DM-R-24: index $INDEX out of range (have ${#SNAPS[@]} snapshots)." >&2
  echo "   Available:" >&2
  for i in "${!SNAPS[@]}"; do
    echo "   $((i+1)). ${SNAPS[$i]}" >&2
  done
  exit 1
fi

TARGET="${SNAPS[$((INDEX-1))]}"
echo "→ DM-R-24: restoring $TARGET" >&2
bash "$REPO_ROOT/scripts/db-restore.sh" "$TARGET"
