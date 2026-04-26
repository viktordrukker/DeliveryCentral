-- DM-8-4 — Postgres role matrix.
--
-- Extends DM-R-20 (app_runtime + app_migrator) with three more roles
-- for the concerns the plan calls out:
--
--   app_reader          — SELECT on all tables. Dashboards / reports
--                         that should never write.
--   app_auditor         — SELECT on audit tables only (AuditLog,
--                         migration_audit, ddl_audit, DomainEvent,
--                         honeypot_alerts, capacity_audit). For
--                         investigators + compliance queries.
--   app_platform_admin  — BYPASSRLS. Cross-tenant workers (outbox
--                         relay, platform-wide search). Never
--                         connected-to from a user-facing path.
--   app_reporting       — SELECT on all tables, intended for a
--                         dedicated reporting connection pool so
--                         heavy analytical reads don't contend with
--                         OLTP.
--
-- All passwords are placeholders; rotate in production before use.
-- Deployments that don't need a role can leave it unused.
--
-- Classification: REVERSIBLE.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_reader') THEN
    CREATE ROLE app_reader LOGIN PASSWORD 'app_reader';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_auditor') THEN
    CREATE ROLE app_auditor LOGIN PASSWORD 'app_auditor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_platform_admin') THEN
    CREATE ROLE app_platform_admin LOGIN PASSWORD 'app_platform_admin' BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_reporting') THEN
    CREATE ROLE app_reporting LOGIN PASSWORD 'app_reporting';
  END IF;
END
$$;

-- --------------------------------------- app_reader (SELECT everywhere)
GRANT CONNECT ON DATABASE workload_tracking TO app_reader;
GRANT USAGE ON SCHEMA public TO app_reader;
GRANT SELECT ON ALL TABLES    IN SCHEMA public TO app_reader;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO app_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES    TO app_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO app_reader;

-- --------------------------------------- app_auditor (audit only)
GRANT CONNECT ON DATABASE workload_tracking TO app_auditor;
GRANT USAGE ON SCHEMA public TO app_auditor;
GRANT SELECT ON "AuditLog"         TO app_auditor;
GRANT SELECT ON migration_audit    TO app_auditor;
GRANT SELECT ON ddl_audit          TO app_auditor;
GRANT SELECT ON "DomainEvent"      TO app_auditor;
GRANT SELECT ON honeypot_alerts    TO app_auditor;
GRANT SELECT ON capacity_audit     TO app_auditor;

-- --------------------------------------- app_platform_admin (BYPASSRLS)
GRANT CONNECT ON DATABASE workload_tracking TO app_platform_admin;
GRANT USAGE ON SCHEMA public TO app_platform_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_platform_admin;
GRANT USAGE                          ON ALL SEQUENCES IN SCHEMA public TO app_platform_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO app_platform_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_platform_admin;

-- --------------------------------------- app_reporting (SELECT + separate pool)
GRANT CONNECT ON DATABASE workload_tracking TO app_reporting;
GRANT USAGE ON SCHEMA public TO app_reporting;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_reporting;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_reporting;

COMMENT ON ROLE app_reader IS
  'DM-8-4 — read-only role for dashboards. No writes, no BYPASSRLS. Separate connection pool reduces OLTP contention.';
COMMENT ON ROLE app_auditor IS
  'DM-8-4 — audit-table-only read role. For investigators + compliance queries. Cannot read business data.';
COMMENT ON ROLE app_platform_admin IS
  'DM-8-4 — cross-tenant worker role (outbox relay, platform search). BYPASSRLS set so tenant RLS does not block platform work.';
COMMENT ON ROLE app_reporting IS
  'DM-8-4 — analytics/reporting read role. Dedicated pool target; see DM-R-30 for read-replica routing.';
