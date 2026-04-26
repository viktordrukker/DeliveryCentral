#!/usr/bin/env bash
# ============================================================================
# DM-8-10 — capacity audit: record row counts + total sizes into
# `capacity_audit`. Run weekly via cron.
#
# Threshold for partition cutover: 5M rows (75% of the 10M operational
# ceiling per the DM-R-28 scale projection). A row-count trend crossing
# 5M in any watched table triggers the partition runbook.
#
# Usage:
#   ./scripts/capacity-audit.sh
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Watched tables — the ones that can grow large.
TABLES=(
  '"DomainEvent"'
  '"AuditLog"'
  'ddl_audit'
  'migration_audit'
  '"WorkEvidence"'
  '"NotificationDelivery"'
  '"NotificationRequest"'
  '"EmployeeActivityEvent"'
  'timesheet_entries'
  '"honeypot_alerts"'
)

for tbl in "${TABLES[@]}"; do
  # `tbl` already has the correct quoting for Postgres (PascalCase
  # tables are double-quoted; snake_case are bare). pg_total_relation_size
  # accepts a quoted-regclass string literal that matches the SELECT.
  docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T postgres \
    psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-workload_tracking}" \
    -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO "capacity_audit" ("tableName", "rowCount", "relSizeBytes")
SELECT
  '${tbl//\"/}',
  (SELECT count(*) FROM ${tbl}),
  pg_total_relation_size('${tbl}'::regclass);
SQL
done

echo "✓ DM-8-10: capacity audit recorded for ${#TABLES[@]} tables." >&2
