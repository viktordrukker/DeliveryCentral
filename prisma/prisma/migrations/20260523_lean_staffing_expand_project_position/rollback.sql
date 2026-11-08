-- Sprint 2 / S2-1 rollback — drops the lean staffing aggregate tables + enums.
-- Safe pre-S2-6 (dual-write seam not yet wired). See REVERSIBLE.md.

DROP TABLE IF EXISTS "ProjectPositionFillHistory" CASCADE;
DROP TABLE IF EXISTS "ProjectPositionCandidate" CASCADE;
DROP TABLE IF EXISTS "ProjectPosition" CASCADE;

DROP TYPE IF EXISTS "ProjectPositionFillChangeType";
DROP TYPE IF EXISTS "ProjectPositionCandidateDecision";
DROP TYPE IF EXISTS "ProjectPositionFillStatus";
