#!/usr/bin/env bash
# restore-from-backup.sh — restore-drill helper.
#
# Run on the VM as deploy. Restores a pg_dump file into a throwaway database,
# verifies a non-zero row count in the Person table, then drops the database
# unless --keep is passed.
#
# Usage:
#   bash ops/restore-from-backup.sh --file /opt/backups/prod-2026-04-25.sql.gz --target-db restore_test
#
# This is your test that backups actually work. Run it once during go-live and
# once per quarter thereafter.

set -euo pipefail

FILE=""
TARGET_DB=""
KEEP=0

while [ $# -gt 0 ]; do
    case "$1" in
        --file)       FILE="$2"; shift 2 ;;
        --target-db)  TARGET_DB="$2"; shift 2 ;;
        --keep)       KEEP=1; shift ;;
        *) echo "unknown arg: $1" >&2; exit 1 ;;
    esac
done

[ -n "$FILE" ] || { echo "--file required"; exit 1; }
[ -n "$TARGET_DB" ] || { echo "--target-db required"; exit 1; }
[ -f "$FILE" ] || { echo "$FILE not found"; exit 1; }

# shellcheck source=/dev/null
source /opt/deliverycentral-data/.env

PG=dc-data-postgres-1
SU=postgres

run_psql() { docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" -i "$PG" psql -U "$SU" -v ON_ERROR_STOP=1 "$@"; }

echo "==> Creating throwaway database $TARGET_DB"
run_psql -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";"
run_psql -d postgres -c "CREATE DATABASE \"$TARGET_DB\";"

echo "==> Restoring $FILE → $TARGET_DB"
gunzip -c "$FILE" | docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" -i "$PG" \
    pg_restore --no-owner --no-acl --dbname "$TARGET_DB" -U "$SU" --verbose 2>&1 \
    | tail -20

echo "==> Verifying restored data"
PERSON_COUNT=$(run_psql -d "$TARGET_DB" -tAc 'SELECT count(*) FROM "Person";' || echo 0)
echo "    Person rows: $PERSON_COUNT"

if [ "$PERSON_COUNT" -gt 0 ]; then
    echo "==> RESTORE DRILL PASS"
else
    echo "==> RESTORE DRILL FAIL: Person table empty or missing"
    exit 1
fi

if [ "$KEEP" -eq 0 ]; then
    echo "==> Dropping $TARGET_DB (use --keep to retain)"
    run_psql -d postgres -c "DROP DATABASE \"$TARGET_DB\";"
fi
