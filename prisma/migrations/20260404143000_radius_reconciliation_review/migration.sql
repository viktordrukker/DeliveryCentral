CREATE TABLE "RadiusReconciliationRecord" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "externalUsername" TEXT,
  "externalDisplayName" TEXT,
  "externalEmail" TEXT,
  "personId" UUID,
  "matchedByStrategy" TEXT,
  "category" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "candidatePersonIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "accountPresenceState" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "lastEvaluatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RadiusReconciliationRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RadiusReconciliationRecord_provider_externalAccountId_key"
ON "RadiusReconciliationRecord"("provider", "externalAccountId");

CREATE INDEX "RadiusReconciliationRecord_provider_category_idx"
ON "RadiusReconciliationRecord"("provider", "category");

CREATE INDEX "RadiusReconciliationRecord_personId_idx"
ON "RadiusReconciliationRecord"("personId");

CREATE INDEX "RadiusReconciliationRecord_lastEvaluatedAt_idx"
ON "RadiusReconciliationRecord"("lastEvaluatedAt");
