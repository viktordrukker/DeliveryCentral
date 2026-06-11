-- PR-15 — bulk-reassign hardening: truthful ledger changeType.
--
-- The bulk-reassign flow previously wrote `ASSIGNED` fill-history rows for
-- in-place person swaps and project moves, fabricating a state-machine
-- progression that never happened. `REASSIGNED` records the real change
-- (status unchanged, person and/or project swapped).
--
-- Pure ADD; no removal / rename — DM-R-6 enum-evolution lint is satisfied.
-- Idempotent via DO-EXCEPTION wrap.

DO $$ BEGIN
  ALTER TYPE "ProjectPositionFillChangeType" ADD VALUE 'REASSIGNED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
