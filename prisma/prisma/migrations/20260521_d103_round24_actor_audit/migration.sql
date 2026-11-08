-- F-68 / D-103 round 24 — actor-audit columns on StaffingRequest
--
-- StaffingRequest is the central PM-initiated demand-capture aggregate.
-- It already has `requestedByPersonId` (the requester) — distinct from
-- the canonical "who created/last-edited the row" semantic. Adding the
-- canonical pair brings StaffingRequest into uniform shape with the
-- other audited aggregates and lets observability tools answer "who
-- last edited this SR" without conflating it with the requester.
--
-- Single-aggregate round (not the usual pair) — StaffingRequest is
-- substantial enough to warrant focused scope.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "staffing_requests"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "staffing_requests"
  ADD CONSTRAINT "staffing_requests_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staffing_requests"
  ADD CONSTRAINT "staffing_requests_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "staffing_requests_createdByPersonId_idx"
  ON "staffing_requests" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "staffing_requests_updatedByPersonId_idx"
  ON "staffing_requests" ("updatedByPersonId");
