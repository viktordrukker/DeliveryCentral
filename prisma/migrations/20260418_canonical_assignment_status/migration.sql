-- Canonical staffing workflow: rename AssignmentStatus enum to the 9 canonical values,
-- add per-reason columns and staffingRequestId FK, preserve existing row data via a
-- value mapping:
--
--   DRAFT      -> CREATED
--   REQUESTED  -> CREATED
--   APPROVED   -> BOOKED
--   ACTIVE     -> ASSIGNED
--   ENDED      -> COMPLETED
--   REJECTED   -> REJECTED
--   REVOKED    -> CANCELLED
--   ARCHIVED   -> CANCELLED

CREATE TYPE "AssignmentStatus_new" AS ENUM (
  'CREATED',
  'PROPOSED',
  'REJECTED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED'
);

ALTER TABLE "ProjectAssignment"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "ProjectAssignment"
  ALTER COLUMN "status" TYPE "AssignmentStatus_new"
  USING (
    CASE "status"::text
      WHEN 'DRAFT' THEN 'CREATED'
      WHEN 'REQUESTED' THEN 'CREATED'
      WHEN 'APPROVED' THEN 'BOOKED'
      WHEN 'ACTIVE' THEN 'ASSIGNED'
      WHEN 'ENDED' THEN 'COMPLETED'
      WHEN 'REJECTED' THEN 'REJECTED'
      WHEN 'REVOKED' THEN 'CANCELLED'
      WHEN 'ARCHIVED' THEN 'CANCELLED'
      ELSE 'CREATED'
    END
  )::"AssignmentStatus_new";

DROP TYPE "AssignmentStatus";
ALTER TYPE "AssignmentStatus_new" RENAME TO "AssignmentStatus";

ALTER TABLE "ProjectAssignment"
  ALTER COLUMN "status" SET DEFAULT 'CREATED';

-- Denormalised reason columns and on-hold case link.
ALTER TABLE "ProjectAssignment"
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "onHoldReason" TEXT,
  ADD COLUMN "onHoldCaseId" UUID;

-- staffingRequestId FK - backfilled from StaffingRequestFulfilment where present.
-- staffing_requests.id is TEXT (UUID content) so the FK column matches that type.
ALTER TABLE "ProjectAssignment"
  ADD COLUMN "staffingRequestId" TEXT;

UPDATE "ProjectAssignment" AS a
SET "staffingRequestId" = f."requestId"
FROM "staffing_request_fulfilments" AS f
WHERE f."assignedPersonId" = a."personId"::text
  AND a."staffingRequestId" IS NULL;

ALTER TABLE "ProjectAssignment"
  ADD CONSTRAINT "ProjectAssignment_staffingRequestId_fkey"
  FOREIGN KEY ("staffingRequestId")
  REFERENCES "staffing_requests"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "ProjectAssignment_staffingRequestId_idx"
  ON "ProjectAssignment"("staffingRequestId");
