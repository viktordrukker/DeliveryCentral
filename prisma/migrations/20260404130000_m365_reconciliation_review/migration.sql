CREATE TABLE "M365DirectoryReconciliationRecord" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "externalUserId" TEXT NOT NULL,
  "externalPrincipalName" TEXT,
  "externalEmail" TEXT,
  "externalDisplayName" TEXT,
  "personId" UUID,
  "matchedByStrategy" TEXT,
  "category" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "candidatePersonIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "resolvedManagerPersonId" UUID,
  "sourceDepartment" TEXT,
  "sourceJobTitle" TEXT,
  "sourceAccountEnabled" BOOLEAN,
  "sourceUpdatedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "lastEvaluatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "M365DirectoryReconciliationRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "M365DirectoryReconciliationRecord_provider_externalUserId_key"
ON "M365DirectoryReconciliationRecord"("provider", "externalUserId");

CREATE INDEX "M365DirectoryReconciliationRecord_provider_category_idx"
ON "M365DirectoryReconciliationRecord"("provider", "category");

CREATE INDEX "M365DirectoryReconciliationRecord_personId_idx"
ON "M365DirectoryReconciliationRecord"("personId");

CREATE INDEX "M365DirectoryReconciliationRecord_lastEvaluatedAt_idx"
ON "M365DirectoryReconciliationRecord"("lastEvaluatedAt");
