-- DM-8-4 rollback.
DO $$
DECLARE
  rname text;
BEGIN
  FOREACH rname IN ARRAY ARRAY['app_reporting','app_platform_admin','app_auditor','app_reader'] LOOP
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', rname);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', rname);
    EXECUTE format('REVOKE USAGE ON SCHEMA public FROM %I', rname);
    EXECUTE format('REVOKE CONNECT ON DATABASE workload_tracking FROM %I', rname);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM %I', rname);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON SEQUENCES FROM %I', rname);
    EXECUTE format('DROP ROLE IF EXISTS %I', rname);
  END LOOP;
END
$$;
