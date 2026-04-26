#!/usr/bin/env bash
# backup.sh — daily Postgres dump for both prod and staging databases.
# Installed as a deploy-user crontab entry by ops/bootstrap-app.sh:
#   0 3 * * * /opt/backups/backup.sh >> /var/log/dc-backup.log 2>&1
#
# Optional offsite sync: edit /opt/backups/.offsite-target with one of
#   rsync://user@u123456.your-storagebox.de/dc-backups/
#   s3://your-bucket/dc-backups/

set -euo pipefail

BACKUP_DIR=/opt/backups
RETENTION_DAYS=14
TS=$(date -u +%F)
PG_CONTAINER=dc-data-postgres-1
DATA_ENV=/opt/deliverycentral-data/.env
OFFSITE_FILE=/opt/backups/.offsite-target

mkdir -p "$BACKUP_DIR"

[ -f "$DATA_ENV" ] || { echo "$(date -u +%FT%TZ) ERROR: $DATA_ENV not found"; exit 1; }
# shellcheck source=/dev/null
source "$DATA_ENV"

dump_db() {
    local db="$1" out="$BACKUP_DIR/${1}-${TS}.sql.gz"
    echo "$(date -u +%FT%TZ) dumping $db → $out"
    docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" "$PG_CONTAINER" \
        pg_dump -U postgres -Fc "$db" | gzip > "$out"
    local size
    size=$(du -h "$out" | cut -f1)
    echo "$(date -u +%FT%TZ) wrote $out ($size)"
}

dump_db workload_tracking_prod
dump_db workload_tracking_staging

# Retention ---------------------------------------------------------
deleted=$(find "$BACKUP_DIR" -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
echo "$(date -u +%FT%TZ) retention: deleted $deleted files older than ${RETENTION_DAYS}d"

# Offsite sync (optional) ------------------------------------------
if [ -f "$OFFSITE_FILE" ]; then
    target=$(head -1 "$OFFSITE_FILE" | tr -d '[:space:]')
    case "$target" in
        rsync://*)
            echo "$(date -u +%FT%TZ) offsite rsync → $target"
            rsync -av --delete "$BACKUP_DIR"/ "$target" 2>&1 \
                && echo "$(date -u +%FT%TZ) rsync OK" \
                || echo "$(date -u +%FT%TZ) rsync FAILED"
            ;;
        s3://*)
            command -v aws >/dev/null || { echo "$(date -u +%FT%TZ) aws CLI missing — skipping s3 sync"; exit 0; }
            echo "$(date -u +%FT%TZ) offsite s3 sync → $target"
            aws s3 sync --delete "$BACKUP_DIR" "$target" 2>&1 \
                && echo "$(date -u +%FT%TZ) s3 sync OK" \
                || echo "$(date -u +%FT%TZ) s3 sync FAILED"
            ;;
        *)
            echo "$(date -u +%FT%TZ) WARNING: unknown offsite target format: $target"
            ;;
    esac
fi
