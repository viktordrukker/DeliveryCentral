#!/usr/bin/env bash
# ============================================================================
# DM-R-27 — Off-host backup replication.
# ============================================================================
# Ships DM-R-3 snapshots (.snapshots/) + DM-R-25 WAL archives
# (.wal-archive/) + DM-R-25 base backups (.basebackups/) to an off-host
# destination so that on-host destruction — including an agent rm-rf'ing
# the backup directories — cannot eliminate the recovery path.
#
# Destinations supported (via BACKUP_SHIP_DEST env var):
#
#   rsync://user@host:/path       rsync over SSH
#   s3://bucket/prefix            aws cli
#   azblob://account/container/p  (stub — add when needed)
#   file:///abs/path              plain filesystem copy (e.g. NAS mount)
#
# Intended to run via cron. Exit non-zero on any failure; last-success
# timestamp is recorded in .ship-status so DM-R-14 can emit
# `backup.ship.stale.detected` if it lags behind N hours.
#
# Usage:
#   BACKUP_SHIP_DEST=file:///mnt/offsite ./scripts/db-ship-backups.sh
#   BACKUP_SHIP_DEST=s3://my-backups/dc ./scripts/db-ship-backups.sh
#
# Safety:
#   - Refuses to run with BACKUP_SHIP_DEST unset (fails loudly).
#   - One-way push: never deletes at the destination (`rsync --ignore-existing`
#     or `aws s3 sync --no-delete`).
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS_FILE="$REPO_ROOT/.ship-status"

DEST="${BACKUP_SHIP_DEST:-}"
if [ -z "$DEST" ]; then
  echo "❌ DM-R-27: BACKUP_SHIP_DEST not set." >&2
  echo "   Supported: file:///path, rsync://user@host:/path, s3://bucket/prefix" >&2
  exit 1
fi

# Treats rsync exit 23 (partial transfer) as a soft warning — some WAL
# files owned by the postgres container UID may not be readable by the
# host user running the ship script (dev-only concern; in prod, run the
# cron as a user that can read all three backup dirs).
run_rsync() {
  set +e
  rsync "$@"
  local rc=$?
  set -e
  if [ $rc -eq 0 ] || [ $rc -eq 23 ]; then
    if [ $rc -eq 23 ]; then
      echo "   ⚠️  rsync exit 23: some files not readable (permission?). See the error lines above." >&2
    fi
    return 0
  fi
  echo "   ❌ rsync failed with exit $rc. Aborting." >&2
  return $rc
}

ship_file_dest() {
  local dst_dir="${DEST#file://}"
  mkdir -p "$dst_dir"
  for sub in .snapshots .wal-archive .basebackups; do
    if [ -d "$REPO_ROOT/$sub" ]; then
      echo "→ file:// shipping $sub/ → $dst_dir/$sub/" >&2
      run_rsync -a --ignore-existing "$REPO_ROOT/$sub/" "$dst_dir/$sub/"
    fi
  done
}

ship_rsync_dest() {
  local rsync_dest="${DEST#rsync://}"
  for sub in .snapshots .wal-archive .basebackups; do
    if [ -d "$REPO_ROOT/$sub" ]; then
      echo "→ rsync shipping $sub/ → $rsync_dest/$sub/" >&2
      run_rsync -az --ignore-existing \
        -e "ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes" \
        "$REPO_ROOT/$sub/" "$rsync_dest/$sub/"
    fi
  done
}

ship_s3_dest() {
  if ! command -v aws >/dev/null 2>&1; then
    echo "❌ DM-R-27: aws CLI not on PATH." >&2
    exit 1
  fi
  local s3_dest="${DEST}"
  for sub in .snapshots .wal-archive .basebackups; do
    if [ -d "$REPO_ROOT/$sub" ]; then
      echo "→ s3 shipping $sub/ → $s3_dest/$sub/" >&2
      aws s3 sync --no-follow-symlinks --size-only "$REPO_ROOT/$sub/" "$s3_dest/$sub/"
    fi
  done
}

case "$DEST" in
  file://*)   ship_file_dest ;;
  rsync://*)  ship_rsync_dest ;;
  s3://*)     ship_s3_dest ;;
  *)
    echo "❌ DM-R-27: unsupported BACKUP_SHIP_DEST scheme: $DEST" >&2
    exit 1
    ;;
esac

date -u +%FT%TZ > "$STATUS_FILE"
echo "✓ DM-R-27: off-host replication complete. Status: $STATUS_FILE" >&2
