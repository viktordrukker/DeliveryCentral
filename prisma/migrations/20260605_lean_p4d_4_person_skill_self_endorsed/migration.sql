-- LEAN-P4d-4 — PersonSkill.selfEndorsed flag.
--
-- Employees can now self-add skills from their /me workspace without an
-- HR approval gate. The new column distinguishes self-endorsed entries
-- from those reviewed (or created) by a manager so HR dashboards can
-- surface the unverified pool without blocking the read path.
--
-- Scope (purely additive):
--   1. Add `selfEndorsed` boolean column to `person_skills`, default
--      FALSE so every legacy row keeps the "manager-recorded" semantics.
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent.
-- REVERSIBLE (DM-R-4) — see REVERSIBLE.md.

ALTER TABLE "person_skills"
  ADD COLUMN IF NOT EXISTS "selfEndorsed" BOOLEAN NOT NULL DEFAULT FALSE;
