-- DM-4-2 rollback — cast enum back to text and drop the type.
-- Data round-trips cleanly because enum labels are the same strings.

ALTER TABLE "WorkEvidence"
  ALTER COLUMN "evidenceType" TYPE text
  USING "evidenceType"::text;

DROP TYPE IF EXISTS "WorkEvidenceType";
