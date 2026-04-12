CREATE TABLE "PersonExternalIdentityLink" (
  "id" UUID NOT NULL,
  "personId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "externalUserId" TEXT NOT NULL,
  "externalPrincipalName" TEXT,
  "matchedByStrategy" TEXT NOT NULL,
  "sourceDepartment" TEXT,
  "sourceJobTitle" TEXT,
  "sourceAccountEnabled" BOOLEAN,
  "externalManagerUserId" TEXT,
  "resolvedManagerPersonId" UUID,
  "sourceUpdatedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "PersonExternalIdentityLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonExternalIdentityLink_provider_externalUserId_key"
ON "PersonExternalIdentityLink"("provider", "externalUserId");

CREATE UNIQUE INDEX "PersonExternalIdentityLink_provider_personId_key"
ON "PersonExternalIdentityLink"("provider", "personId");

CREATE INDEX "PersonExternalIdentityLink_externalPrincipalName_idx"
ON "PersonExternalIdentityLink"("externalPrincipalName");

CREATE INDEX "PersonExternalIdentityLink_resolvedManagerPersonId_idx"
ON "PersonExternalIdentityLink"("resolvedManagerPersonId");

ALTER TABLE "PersonExternalIdentityLink"
ADD CONSTRAINT "PersonExternalIdentityLink_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
