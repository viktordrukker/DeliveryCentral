#!/usr/bin/env bash
# ============================================================================
# DM-R-7 — Record migration audit row.
# ============================================================================
# Writes one row into migration_audit capturing who ran a migration, from
# where, against which git commit, and whether it succeeded. Intended to be
# called from scripts/db-migrate-safe.sh after the Prisma command.
#
# Usage:
#   record-migration-audit.sh <mode> <success> [notes]
#     <mode>    = deploy | dev | reset | status
#     <success> = true | false
#     [notes]   = optional free-text appended to the row
#
# Env inputs (optional, all best-effort):
#   AGENT_ID              — set by automation (DM-R-12/26). Defaults to unset.
#   MIGRATIONS_APPLIED    — comma-sep list of migration names just applied
#                           (caller fills this from `prisma migrate status`).
#
# Safety:
#   - Never fails the calling script. If the audit write fails (DB down,
#     missing table because this migration itself hasn't landed yet, etc.)
#     we log a warning and exit 0. The migration itself has its own
#     success/failure path — audit is observational, not gating.
# ============================================================================

set -uo pipefail

MODE="${1:-unknown}"
SUCCESS="${2:-unknown}"
NOTES="${3:-}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

OS_USER="${USER:-$(id -un 2>/dev/null || echo unknown)}"
HOSTNAME_VAL="$(hostname 2>/dev/null || echo unknown)"
GIT_EMAIL="$(git -C "$REPO_ROOT" config user.email 2>/dev/null || echo unknown)"
GIT_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
AGENT_ID_VAL="${AGENT_ID:-}"
MIGRATIONS_VAL="${MIGRATIONS_APPLIED:-}"

# Postgres identifier quoting: single-quote string literals, escape any
# embedded single-quote by doubling it.
pg_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

SQL=$(
  printf "INSERT INTO \"migration_audit\" (migration_mode, migrations, os_user, git_email, git_sha, agent_id, hostname, success, notes) VALUES ('%s', NULLIF('%s', ''), NULLIF('%s', ''), NULLIF('%s', ''), NULLIF('%s', ''), NULLIF('%s', ''), NULLIF('%s', ''), %s, NULLIF('%s', ''));" \
    "$(pg_escape "$MODE")" \
    "$(pg_escape "$MIGRATIONS_VAL")" \
    "$(pg_escape "$OS_USER")" \
    "$(pg_escape "$GIT_EMAIL")" \
    "$(pg_escape "$GIT_SHA")" \
    "$(pg_escape "$AGENT_ID_VAL")" \
    "$(pg_escape "$HOSTNAME_VAL")" \
    "$([ "$SUCCESS" = "true" ] && echo TRUE || echo FALSE)" \
    "$(pg_escape "$NOTES")"
)

# Delegate to docker postgres — same pattern as db-snapshot / db-restore.
if ! command -v docker >/dev/null 2>&1; then
  echo "⚠️  DM-R-7 audit: 'docker' not available; audit row not written." >&2
  exit 0
fi

if ! docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
       psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-workload_tracking}" \
       -v ON_ERROR_STOP=1 -tAc "$SQL" >/dev/null 2>&1; then
  echo "⚠️  DM-R-7 audit: write failed (table may not exist yet or DB unreachable). Skipping." >&2
  exit 0
fi

echo "📝 DM-R-7 audit: row recorded (mode=$MODE success=$SUCCESS agent=${AGENT_ID_VAL:-none})." >&2
