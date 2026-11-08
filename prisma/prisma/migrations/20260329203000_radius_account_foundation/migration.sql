CREATE TABLE "ExternalAccountLink" (
  "id" UUID NOT NULL,
  "personId" UUID,
  "provider" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "externalUsername" TEXT,
  "externalDisplayName" TEXT,
  "externalEmail" TEXT,
  "matchedByStrategy" TEXT,
  "accountPresenceState" TEXT,
  "sourceUpdatedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "ExternalAccountLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalAccountLink_provider_externalAccountId_key"
ON "ExternalAccountLink"("provider", "externalAccountId");

CREATE INDEX "ExternalAccountLink_provider_personId_idx"
ON "ExternalAccountLink"("provider", "personId");

CREATE INDEX "ExternalAccountLink_externalUsername_idx"
ON "ExternalAccountLink"("externalUsername");

CREATE INDEX "ExternalAccountLink_externalEmail_idx"
ON "ExternalAccountLink"("externalEmail");

ALTER TABLE "ExternalAccountLink"
ADD CONSTRAINT "ExternalAccountLink_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
