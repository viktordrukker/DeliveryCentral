-- Sprint 2 / S2-7a — extend AggregateType enum with ProjectPosition.
--
-- The lean staffing aggregate (S2-1) now has a corresponding entry in the
-- DomainEvent outbox AggregateType so that `project_position.fill.changed`
-- events can be recorded by the S2-6 dual-write mirror (wired in PR-B,
-- ships separately).
--
-- Pure ADD; no removal / rename — DM-R-6 enum-evolution lint is satisfied.
-- Idempotent via DO-EXCEPTION wrap.

DO $$ BEGIN
  ALTER TYPE "AggregateType" ADD VALUE 'ProjectPosition';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
