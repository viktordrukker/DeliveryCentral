-- V2-D: PulseReport — per-dimension tiered weekly status narrative

CREATE TABLE "pulse_reports" (
  "id"                  UUID             NOT NULL DEFAULT gen_random_uuid(),
  "projectId"           UUID             NOT NULL,
  "weekStarting"        DATE             NOT NULL,
  "dimensions"          JSONB            NOT NULL DEFAULT '{}',
  "overallNarrative"    TEXT,
  "submittedByPersonId" UUID,
  "submittedAt"         TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "pulse_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pulse_reports_projectId_weekStarting_key"
  ON "pulse_reports" ("projectId", "weekStarting");

CREATE INDEX "pulse_reports_projectId_idx" ON "pulse_reports" ("projectId");
