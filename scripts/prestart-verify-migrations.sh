#!/usr/bin/env bash
# ============================================================================
# DM-R-1 — Startup migration barrier
# ============================================================================
# Refuses to let the backend start when the database migration state is not in
# sync with what the application expects.
#
# Stops the 2026-04-18 class of failure: backend boots against a drifted DB
# and serves 500s on every dashboard because Prisma Client expects columns the
# DB does not have (or vice versa).
#
# Checks performed, in order:
#   1. `npx prisma migrate status` — catches pending migrations, migrations that
#      have been modified after apply, and migrations applied to the DB but
#      missing from the local `prisma/migrations/` directory.
#   2. Half-applied row detection — a row in `_prisma_migrations` with
#      `finished_at IS NULL AND rolled_back_at IS NULL` means a migration
#      crashed mid-apply. Blocking this is safer than guessing. Uses the
#      Prisma Client helper `scripts/verify-migrations-deep.cjs`.
#
# Exit codes:
#   0 — DB state clean. Backend may proceed with start.
#   1 — drift detected. Backend must not start.
#
# Bypass (developer only):
#   PRESTART_VERIFIER_DISABLE=true  — skip this check entirely.
#   Intentional only. Explain in the commit / PR why.
# ============================================================================

set -euo pipefail

if [ "${PRESTART_VERIFIER_DISABLE:-false}" = "true" ]; then
  echo "⚠️  PRESTART_VERIFIER_DISABLE=true — skipping DM-R-1 migration check." >&2
  exit 0
fi

SCHEMA_PATH="${PRISMA_SCHEMA_PATH:-prisma/schema.prisma}"

# DM-4-4 — UTC enforcement gates the boot. Must run BEFORE any timestamp
# arithmetic (including migrate deploy) so a non-UTC container never
# touches Timestamptz columns.
if [ -f "scripts/check-tz-is-utc.cjs" ]; then
  if ! node scripts/check-tz-is-utc.cjs >&2; then
    echo "❌ DM-4-4: UTC precondition violated; refusing to boot." >&2
    exit 1
  fi
fi

echo "🔒 DM-R-1: verifying migration state before app start..." >&2

# Layer 1 — Prisma's own migrate status.
status_log="$(mktemp)"
trap 'rm -f "$status_log"' EXIT

if ! npx prisma migrate status --schema="$SCHEMA_PATH" > "$status_log" 2>&1; then
  echo "" >&2
  echo "❌ DM-R-1: prisma migrate status reported drift." >&2
  echo "" >&2
  # Surface the most useful Prisma output lines.
  status_summary="$(grep -E "(have not yet been applied|have been modified|are missing from|Following migration)" "$status_log" | head -5)"
  if [ -z "$status_summary" ]; then
    status_summary="$(cat "$status_log")"
  fi
  echo "$status_summary" >&2
  echo "" >&2
  echo "Fix:" >&2
  echo "  • Run 'npm run db:migrate:safe' to reconcile (DM-R-3, once landed)." >&2
  echo "  • Or 'npx prisma migrate deploy' for prod-style apply." >&2
  echo "  • Or 'npx prisma migrate dev' locally if you are authoring a migration." >&2
  echo "" >&2
  echo "Bypass (dev only, not production): PRESTART_VERIFIER_DISABLE=true" >&2
  # DM-R-14: structured drift event, emitted to stdout (where the runtime
  # log drain tails). JSON-escape the summary via an env pass-through.
  SUMMARY="$status_summary" node -e "require('./scripts/lib/drift-events.cjs').emitEvent('schema.drift.detected', { source: 'prisma.migrate.status', summary: process.env.SUMMARY || '' })" 2>/dev/null || true
  exit 1
fi

# Surface Prisma's "all good" line so the log shows the positive.
grep -E "up to date|no pending" "$status_log" >&2 || true

# Layer 2 — half-applied row detection via Prisma Client. Non-fatal fail-open
# if the deep check cannot run (e.g. Prisma Client not yet generated during
# a fresh container boot); Layer 1 already caught the common cases.
if [ -f "scripts/verify-migrations-deep.cjs" ]; then
  if ! node scripts/verify-migrations-deep.cjs >&2; then
    echo "" >&2
    echo "❌ DM-R-1: deep migration check failed (see above)." >&2
    exit 1
  fi
fi

echo "✓ DM-R-1: migration state verified. Proceeding with app start." >&2
