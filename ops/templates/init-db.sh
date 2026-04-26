#!/bin/bash
# Postgres init script — runs ONCE on first boot via /docker-entrypoint-initdb.d/.
# Re-runs are no-ops because Postgres only invokes this directory when
# /var/lib/postgresql/data is empty.
#
# Creates two databases + two roles, with CONNECTION LIMITs that prevent
# staging from saturating the shared instance.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE ${DC_PROD_USER}    WITH LOGIN PASSWORD '${DC_PROD_PASSWORD}'    CONNECTION LIMIT 60;
    CREATE ROLE ${DC_STAGING_USER} WITH LOGIN PASSWORD '${DC_STAGING_PASSWORD}' CONNECTION LIMIT 20;

    CREATE DATABASE ${DC_PROD_DB}    OWNER ${DC_PROD_USER};
    CREATE DATABASE ${DC_STAGING_DB} OWNER ${DC_STAGING_USER};

    GRANT ALL PRIVILEGES ON DATABASE ${DC_PROD_DB}    TO ${DC_PROD_USER};
    GRANT ALL PRIVILEGES ON DATABASE ${DC_STAGING_DB} TO ${DC_STAGING_USER};
EOSQL

# Per-DB schema permissions (Postgres 15+ requires explicit GRANT on public schema).
for entry in "${DC_PROD_DB}:${DC_PROD_USER}" "${DC_STAGING_DB}:${DC_STAGING_USER}"; do
    db="${entry%%:*}"
    user="${entry##*:}"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-EOSQL
        GRANT ALL ON SCHEMA public TO ${user};
        ALTER SCHEMA public OWNER TO ${user};
EOSQL
done

echo "init-db.sh: created databases ${DC_PROD_DB} and ${DC_STAGING_DB} with their owner roles."
