-- Grant DML to runtime DB roles for tables created by Phase HD migrations
-- (and two earlier Slate tables that slipped past the existing GRANT path).
--
-- Why this is needed: same root cause as 20260502_setup_wizard_grants —
--   `ALTER DEFAULT PRIVILEGES ... GRANT ON TABLES TO <user>` only fires
-- for tables created by the role that issued the ALTER. Phase HD
-- migrations created their tables via the migrator role, so the runtime
-- role (`app_runtime` / `staging_user` / `prod_user`) was never granted.
-- Result: every endpoint touching a Phase HD table returned 500 with
-- `42501 permission denied for table <name>`.
--
-- Observed on staging 2026-05-10 after Phase HD #19 shipped:
--   GET  /api/help/onboarding/welcome      -> 500 (onboarding_tour_progress)
--   PUT  /api/help/onboarding/welcome      -> 500 (onboarding_tour_progress)
--   GET  /api/admin/responsibility-rules   -> 500 (responsibility_rules)
--
-- Tables affected (verified via pg_tables + has_table_privilege):
--   help_articles, help_feedback, help_tips, onboarding_tour_progress,
--   rate_cards, rate_card_entries, responsibility_rules,
--   project_activation_approvals, person_release_requests,
--   person_release_approvals, idempotency_keys,
--   "StaffingRequestProposalSlate", "StaffingRequestProposalCandidate"
--
-- This migration also re-asserts ALTER DEFAULT PRIVILEGES so future
-- migrations creating tables under the same role don't repeat the issue.
--
-- 2026-05-11 fix: dropped `FOR ROLE postgres` from the ALTER DEFAULT
-- PRIVILEGES clauses. The original `FOR ROLE postgres` clause meant
-- "when role `postgres` creates a future table…" — but Prisma migrations
-- create tables under the *migrator* role (`app_migrator` on staging,
-- `prod_user` on prod), never under `postgres`. Worse, the FOR ROLE
-- variant required the migrator to be a member of the `postgres` role,
-- which `app_migrator` is not — failing the migration with
-- `42501 permission denied to change default privileges`. The
-- no-FOR-ROLE variant defaults to the *current* role (= migrator), which
-- is exactly what we want. EXCEPTION block guards against future cluster
-- configurations where the current role still can't ALTER its own
-- defaults.
--
-- Idempotent (GRANT + ALTER DEFAULT PRIVILEGES are idempotent in postgres),
-- skips runtime roles that don't exist (dev/test DBs).
--
-- Classification: REVERSIBLE.

DO $$
DECLARE
  r record;
  t text;
  tables text[] := ARRAY[
    'help_articles',
    'help_feedback',
    'help_tips',
    'onboarding_tour_progress',
    'rate_cards',
    'rate_card_entries',
    'responsibility_rules',
    'project_activation_approvals',
    'person_release_requests',
    'person_release_approvals',
    'idempotency_keys',
    'StaffingRequestProposalSlate',
    'StaffingRequestProposalCandidate'
  ];
BEGIN
  FOR r IN
    SELECT rolname
    FROM pg_roles
    WHERE rolname IN ('prod_user', 'staging_user', 'app_runtime')
      AND rolcanlogin
  LOOP
    FOREACH t IN ARRAY tables LOOP
      IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO %I',
          t, r.rolname
        );
      END IF;
    END LOOP;

    EXECUTE format(
      'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO %I',
      r.rolname
    );

    -- Future tables created by the *current* role (= migrator) auto-grant
    -- DML to the runtime role. Wrapped in EXCEPTION for clusters where
    -- ALTER DEFAULT PRIVILEGES on the current role is still restricted.
    BEGIN
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public '
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
        r.rolname
      );
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping ALTER DEFAULT PRIVILEGES (tables) for % — insufficient_privilege; existing tables still granted.', r.rolname;
    END;

    BEGIN
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public '
        'GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
        r.rolname
      );
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping ALTER DEFAULT PRIVILEGES (sequences) for % — insufficient_privilege; existing sequences still granted.', r.rolname;
    END;
  END LOOP;
END $$;
