-- V2.1-A: OrgConfig RAG cutoffs + colour-blind mode

ALTER TABLE "organization_configs"
  ADD COLUMN "ragThresholdCritical" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN "ragThresholdRed"      DECIMAL(3,2) NOT NULL DEFAULT 2.0,
  ADD COLUMN "ragThresholdAmber"    DECIMAL(3,2) NOT NULL DEFAULT 3.0,
  ADD COLUMN "colourBlindMode"      BOOLEAN      NOT NULL DEFAULT false;
