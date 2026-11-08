-- DM-4-3 — unify `staffing_requests.allocationPercent` to
-- `numeric(5, 2)`, matching `ProjectAssignment.allocationPercent` and
-- `project_role_plans.allocationPercent`.
--
-- Rationale: same concept, same domain (0..100), but two types → silent
-- coercion bugs in the staffing planner (see workforce-planner.service).
-- Int dropped any fractional (e.g. 37.5%); after this, fractional
-- allocation is first-class.
--
-- Strategy (dev-scale): direct `ALTER COLUMN TYPE numeric(5,2) USING
-- allocationPercent::numeric`. Production-scale (>1M rows) should
-- instead shadow-column + backfill + swap; see
-- docs/planning/dm2-expand-contract-runbook.md for the canonical dance.
-- Dev has ~6 rows; the direct ALTER is milliseconds, no migration
-- lock concern.
--
-- Classification: REVERSIBLE. Rollback casts numeric → integer (floors
-- fractional values; document the precision loss in the rollback).

ALTER TABLE "staffing_requests"
  ALTER COLUMN "allocationPercent" TYPE numeric(5, 2)
  USING "allocationPercent"::numeric(5, 2);
