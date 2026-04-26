#!/usr/bin/env bash
# ============================================================================
# DM-R-3 / DM-R-18 — Safe `prisma migrate reset` wrapper
# ============================================================================
# `prisma migrate reset` drops the entire database. Pointing it at a staging
# or prod URL is catastrophic. This wrapper refuses unless the DATABASE_URL
# clearly points at a dev host (localhost / 127.0.0.1 / postgres docker
# service), then calls db-snapshot.sh so the pre-reset state is recoverable.
#
# Usage:
#   ./scripts/db-reset-safe.sh
# ============================================================================

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

ALLOW_PROD="${DB_RESET_ALLOW_PROD:-false}"

# Dev-host guard.
case "$DATABASE_URL" in
  *@localhost:*|*@127.0.0.1:*|*@postgres:*)
    DEV_HOST=true
    ;;
  *)
    DEV_HOST=false
    ;;
esac

if [ "$DEV_HOST" != "true" ] && [ "$ALLOW_PROD" != "true" ]; then
  echo "❌ DM-R-3 reset: DATABASE_URL does not look like a dev host." >&2
  echo "   Got: $(echo "$DATABASE_URL" | sed 's#//[^@]*@#//***@#')" >&2
  echo "   REFUSING to reset a non-dev database. Set DB_RESET_ALLOW_PROD=true to override." >&2
  exit 1
fi

MASKED_URL=$(echo "$DATABASE_URL" | sed 's#//[^@]*@#//***@#')
echo "⚠️  DM-R-3 reset: this drops ALL data in:" >&2
echo "    $MASKED_URL" >&2

if [ "${DB_RESET_FORCE:-false}" != "true" ]; then
  printf "Type 'RESET' to confirm: " >&2
  read -r CONFIRM
  if [ "$CONFIRM" != "RESET" ]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "📦 DM-R-3 reset: snapshotting before reset..." >&2
SNAPSHOT=$(bash "$REPO_ROOT/scripts/db-snapshot.sh" "pre-reset" 2>&1 | tail -1)
echo "   snapshot: $SNAPSHOT" >&2

echo "💥 DM-R-3 reset: running prisma migrate reset --force --skip-seed..." >&2
npx prisma migrate reset --force --skip-seed --schema=prisma/schema.prisma

echo "🌱 DM-R-3 reset: seeding..." >&2
npm run db:seed || echo "⚠️  seed failed; DB is fresh but empty" >&2

echo "✓ DM-R-3 reset: complete. Snapshot retained at $SNAPSHOT." >&2
