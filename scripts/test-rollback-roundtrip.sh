#!/usr/bin/env bash
# ============================================================================
# DM-R-11 — Rollback round-trip validator.
# ============================================================================
# For every migration carrying REVERSIBLE.md + rollback.sql, prove that
# the rollback is bit-accurate: starting from an "all migrations applied"
# DB, execute rollback.sql → capture hash → re-execute migration.sql →
# capture hash → assert the post-reapply hash equals the pre-rollback
# hash. A fake rollback (SQL that runs cleanly but silently drops data,
# renames things differently, or leaves constraints behind) fails this
# test deterministically via hash mismatch.
#
# Precondition: DATABASE_URL points at a DB that already has every
# migration in prisma/migrations/ applied. The caller (CI workflow, local
# smoke script) is responsible for getting there via
# `prisma migrate deploy` or by restoring a dev-DB snapshot.
#
# Environment:
#   DATABASE_URL            — required; ephemeral DB only (refuses non-dev URLs)
#   ROUNDTRIP_ALLOW_ANY_DB  — "true" to bypass the dev-URL guard
#                             (CI ephemeral hosts that don't match the
#                              default dev-safe list)
#
# Exit code: 0 on clean pass, 1 on any hash mismatch or SQL error.
# ============================================================================

set -uo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

ALLOW_ANY="${ROUNDTRIP_ALLOW_ANY_DB:-false}"
if [ "$ALLOW_ANY" != "true" ]; then
  case "$DATABASE_URL" in
    *@localhost:*|*@127.0.0.1:*|*@postgres:*)
      : ;;
    *)
      echo "❌ DM-R-11: DATABASE_URL does not look ephemeral." >&2
      echo "   Set ROUNDTRIP_ALLOW_ANY_DB=true if this really is a throwaway DB." >&2
      exit 1
      ;;
  esac
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/prisma/migrations"

command -v psql >/dev/null 2>&1 || { echo "❌ psql not on PATH." >&2; exit 1; }
command -v pg_dump >/dev/null 2>&1 || { echo "❌ pg_dump not on PATH." >&2; exit 1; }

# Strip Prisma ?schema=... query params — pg_dump/psql do not understand them.
CLEAN_URL="${DATABASE_URL%%\?*}"

schema_hash() {
  local dump_file
  dump_file="$(mktemp)"
  if ! pg_dump --schema-only --no-owner --no-privileges \
    --no-comments --no-publications --no-subscriptions \
    "$CLEAN_URL" > "$dump_file" 2>/tmp/dm-r-11-pgdump.err; then
    echo "❌ DM-R-11: pg_dump failed. See /tmp/dm-r-11-pgdump.err" >&2
    cat /tmp/dm-r-11-pgdump.err >&2
    rm -f "$dump_file"
    exit 2
  fi
  if [ ! -s "$dump_file" ]; then
    echo "❌ DM-R-11: pg_dump produced empty output." >&2
    rm -f "$dump_file"
    exit 2
  fi
  # pg_dump 16+ emits \restrict / \unrestrict psql pseudo-commands that
  # carry a fresh random token per invocation. These are not schema
  # content and would poison hash equivalence; strip them.
  local result
  result=$(
    grep -v "^-- " "$dump_file" \
      | grep -v "^SET " \
      | grep -v "^SELECT pg_catalog" \
      | grep -v '^\\restrict ' \
      | grep -v '^\\unrestrict ' \
      | sed '/^$/d' \
      | sha256sum | awk '{print $1}'
  )
  rm -f "$dump_file"
  printf "%s" "$result"
}

run_sql_file() {
  local file="$1"
  psql "$CLEAN_URL" -v ON_ERROR_STOP=1 -q -f "$file" > /dev/null
}

# 1) Collect REVERSIBLE migrations in chronological (apply) order.
mapfile -t REVERSIBLE < <(
  find "$MIGRATIONS_DIR" -mindepth 2 -maxdepth 2 -type f -name 'REVERSIBLE.md' \
    -printf '%h\n' | sed 's|.*/||' | sort
)

if [ "${#REVERSIBLE[@]}" -eq 0 ]; then
  echo "❌ DM-R-11: no REVERSIBLE.md markers found — nothing to round-trip." >&2
  exit 1
fi

echo "🔎 DM-R-11: ${#REVERSIBLE[@]} REVERSIBLE migrations; validating round-trip." >&2

# 2) Iterate in REVERSE order. Rolling back a later migration first avoids
#    dependency conflicts (a rollback that drops a column another migration
#    references will fail if executed out of order).
PASS=0
FAIL=0
FAILURES=()

for (( i=${#REVERSIBLE[@]}-1; i>=0; i-- )); do
  dir="${REVERSIBLE[$i]}"
  sql_path="$MIGRATIONS_DIR/$dir/migration.sql"
  rb_path="$MIGRATIONS_DIR/$dir/rollback.sql"

  if [ ! -f "$sql_path" ]; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$dir: missing migration.sql (REVERSIBLE.md orphan)")
    continue
  fi
  if [ ! -f "$rb_path" ]; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$dir: REVERSIBLE.md present but rollback.sql missing")
    continue
  fi

  applied_hash=$(schema_hash)

  if ! run_sql_file "$rb_path" 2> "/tmp/dm-r-11-rollback-$dir.log"; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$dir: rollback.sql FAILED — see /tmp/dm-r-11-rollback-$dir.log")
    continue
  fi
  rolled_back_hash=$(schema_hash)

  if [ "$rolled_back_hash" = "$applied_hash" ]; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$dir: rollback.sql ran cleanly but produced ZERO schema change — fake rollback suspected")
    continue
  fi

  if ! run_sql_file "$sql_path" 2> "/tmp/dm-r-11-reapply-$dir.log"; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$dir: migration.sql FAILED on re-apply — not idempotent (see /tmp/dm-r-11-reapply-$dir.log)")
    continue
  fi
  reapplied_hash=$(schema_hash)

  if [ "$reapplied_hash" != "$applied_hash" ]; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$dir: re-apply produced drift (applied=$applied_hash reapplied=$reapplied_hash)")
    continue
  fi

  PASS=$((PASS + 1))
  printf "✓ %s\n" "$dir" >&2
done

echo >&2
echo "================================================================" >&2
echo "DM-R-11 round-trip summary:" >&2
echo "  passed : $PASS" >&2
echo "  failed : $FAIL" >&2

if [ "$FAIL" -gt 0 ]; then
  echo >&2
  echo "Failure details:" >&2
  for f in "${FAILURES[@]}"; do
    echo "  ✗ $f" >&2
  done
  exit 1
fi

echo "================================================================" >&2
echo "✓ DM-R-11: all ${PASS} REVERSIBLE rollbacks round-trip bit-accurately." >&2
exit 0
