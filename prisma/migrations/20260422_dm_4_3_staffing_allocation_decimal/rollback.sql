-- DM-4-3 rollback. PRECISION LOSS: numeric → integer floors any
-- fractional allocation. Rows written since DM-4-3 landed that use
-- fractional percents will be silently truncated by this rollback.
-- Take a snapshot first.

ALTER TABLE "staffing_requests"
  ALTER COLUMN "allocationPercent" TYPE integer
  USING floor("allocationPercent")::integer;
