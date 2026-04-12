CREATE TABLE IF NOT EXISTS "person_cost_rates" (
  "id"            TEXT           NOT NULL,
  "personId"      TEXT           NOT NULL,
  "effectiveFrom" DATE           NOT NULL,
  "hourlyRate"    DECIMAL(10, 2) NOT NULL,
  "rateType"      TEXT           NOT NULL DEFAULT 'INTERNAL',
  "createdAt"     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "person_cost_rates_pkey" PRIMARY KEY ("id")
);
