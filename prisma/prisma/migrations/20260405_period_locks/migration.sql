CREATE TABLE IF NOT EXISTS "period_locks" (
  "id"          TEXT         NOT NULL,
  "periodFrom"  DATE         NOT NULL,
  "periodTo"    DATE         NOT NULL,
  "lockedBy"    TEXT         NOT NULL,
  "lockedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "period_locks_pkey" PRIMARY KEY ("id")
);
