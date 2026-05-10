# REVERSIBLE

**Posture:** REVERSIBLE. Sibling `rollback.sql` revokes the same DML
privileges this migration grants.

## What this migration does

Grants `SELECT, INSERT, UPDATE, DELETE` to the runtime DB roles
(`prod_user`, `staging_user`, `app_runtime`) on the 13 tables created
by Phase HD migrations and two earlier Slate tables. Also re-asserts
`ALTER DEFAULT PRIVILEGES` so future tables created under the
postgres role auto-grant to the same runtime roles.

## Why a separate migration

Same root cause as `20260502_setup_wizard_grants`. `ALTER DEFAULT
PRIVILEGES` only auto-grants for tables created by the role that
issued the ALTER. Phase HD migrations created tables via a different
role, so runtime users were never granted. The first runtime query
after deploy hit `42501 permission denied for table <name>` and
returned 500.

## Tables granted

`help_articles`, `help_feedback`, `help_tips`,
`onboarding_tour_progress`, `rate_cards`, `rate_card_entries`,
`responsibility_rules`, `project_activation_approvals`,
`person_release_requests`, `person_release_approvals`,
`idempotency_keys`, `StaffingRequestProposalSlate`,
`StaffingRequestProposalCandidate`.

## Idempotency

`GRANT` + `ALTER DEFAULT PRIVILEGES` are idempotent in postgres.
Re-running is safe. The `pg_roles` filter skips runtime roles that
don't exist in dev/test clusters.

## Verified manually 2026-05-10 on staging

```
SELECT count(*) FROM pg_tables t
WHERE schemaname='public'
  AND NOT has_table_privilege('app_runtime', format('%I.%I', schemaname, tablename), 'SELECT');
-- => 0 (was 13 before the GRANT)
```
