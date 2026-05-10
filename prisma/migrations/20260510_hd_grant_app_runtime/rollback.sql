-- Rollback for 20260510_hd_grant_app_runtime — revokes the DML grants
-- and the ALTER DEFAULT PRIVILEGES re-assertion. Idempotent: REVOKE on
-- a missing privilege is a no-op (no error). Skips runtime roles that
-- don't exist on the cluster.

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
          'REVOKE SELECT, INSERT, UPDATE, DELETE ON public.%I FROM %I',
          t, r.rolname
        );
      END IF;
    END LOOP;

    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public '
      'REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM %I',
      r.rolname
    );

    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public '
      'REVOKE USAGE, SELECT, UPDATE ON SEQUENCES FROM %I',
      r.rolname
    );
  END LOOP;
END $$;
