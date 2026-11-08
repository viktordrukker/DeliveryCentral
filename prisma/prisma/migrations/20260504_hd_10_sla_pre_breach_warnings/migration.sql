-- HD-10 — Add SLA pre-breach warning timestamp columns.
-- Each column tracks when the corresponding warning level was emitted,
-- so the sweep can deduplicate across ticks.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='ProjectAssignment'
      AND column_name='slaWarnedAt50pct'
  ) THEN
    ALTER TABLE "ProjectAssignment"
      ADD COLUMN "slaWarnedAt50pct" TIMESTAMPTZ(3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='ProjectAssignment'
      AND column_name='slaWarnedAt75pct'
  ) THEN
    ALTER TABLE "ProjectAssignment"
      ADD COLUMN "slaWarnedAt75pct" TIMESTAMPTZ(3);
  END IF;
END$$;
