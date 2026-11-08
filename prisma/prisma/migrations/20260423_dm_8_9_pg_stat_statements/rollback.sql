-- DM-8-9 rollback. `shared_preload_libraries` setting stays in
-- docker-compose.yml and is harmless without the extension (Postgres
-- logs a warning on boot); remove it from compose separately.
DROP EXTENSION IF EXISTS pg_stat_statements;
