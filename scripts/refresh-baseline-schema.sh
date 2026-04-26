#!/usr/bin/env bash
# ============================================================================
# DM-R-11 — Refresh the baseline schema dump.
# ============================================================================
# CI's rollback round-trip cannot apply the migration history from scratch
# (pre-existing bit-rot: tables exist in the live DB that have no CREATE
# TABLE in any migration — separate tracker follow-up). Instead, we
# restore a baseline pg_dump of the live dev DB's schema, then round-trip
# REVERSIBLE migrations against that state.
#
# This script regenerates the baseline from the live dev DB. Run after
# any intentional schema change (new migration, rollback, etc.) so CI
# stays in sync.
#
# Usage:
#   ./scripts/refresh-baseline-schema.sh
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASELINE="$REPO_ROOT/prisma/migrations/.baseline-schema.sql"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ DM-R-11: docker CLI not available." >&2
  exit 1
fi

echo "📦 DM-R-11: dumping current dev DB schema → $BASELINE" >&2

docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
  pg_dump --schema-only --no-owner --no-privileges \
  --no-comments --no-publications --no-subscriptions \
  -U "${POSTGRES_USER:-postgres}" \
  "${POSTGRES_DB:-workload_tracking}" \
  | grep -v '^\\restrict ' | grep -v '^\\unrestrict ' \
  > "$BASELINE"

if [ ! -s "$BASELINE" ]; then
  echo "❌ DM-R-11: baseline dump is empty." >&2
  exit 1
fi

BYTES=$(stat -c%s "$BASELINE" 2>/dev/null || stat -f%z "$BASELINE")
echo "✓ DM-R-11: baseline refreshed ($BYTES bytes)." >&2
echo "  Commit prisma/migrations/.baseline-schema.sql in the same PR that changed the schema." >&2
