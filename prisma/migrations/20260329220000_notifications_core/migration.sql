CREATE TYPE "NotificationRequestStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "NotificationChannel" (
  "id" UUID NOT NULL,
  "channelKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTemplate" (
  "id" UUID NOT NULL,
  "templateKey" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "channelId" UUID NOT NULL,
  "subjectTemplate" TEXT,
  "bodyTemplate" TEXT NOT NULL,
  "isSystemManaged" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationRequest" (
  "id" UUID NOT NULL,
  "eventName" TEXT NOT NULL,
  "templateId" UUID NOT NULL,
  "channelId" UUID NOT NULL,
  "recipient" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "NotificationRequestStatus" NOT NULL DEFAULT 'QUEUED',
  "failureReason" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" UUID NOT NULL,
  "notificationRequestId" UUID NOT NULL,
  "channelId" UUID NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "renderedSubject" TEXT,
  "renderedBody" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "failureReason" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationChannel_channelKey_key" ON "NotificationChannel"("channelKey");
CREATE UNIQUE INDEX "NotificationTemplate_templateKey_key" ON "NotificationTemplate"("templateKey");
CREATE INDEX "NotificationChannel_kind_isEnabled_idx" ON "NotificationChannel"("kind", "isEnabled");
CREATE INDEX "NotificationTemplate_eventName_archivedAt_idx" ON "NotificationTemplate"("eventName", "archivedAt");
CREATE INDEX "NotificationTemplate_channelId_archivedAt_idx" ON "NotificationTemplate"("channelId", "archivedAt");
CREATE INDEX "NotificationRequest_eventName_status_requestedAt_idx" ON "NotificationRequest"("eventName", "status", "requestedAt");
CREATE INDEX "NotificationRequest_recipient_requestedAt_idx" ON "NotificationRequest"("recipient", "requestedAt");
CREATE INDEX "NotificationDelivery_notificationRequestId_attemptedAt_idx" ON "NotificationDelivery"("notificationRequestId", "attemptedAt");
CREATE INDEX "NotificationDelivery_status_attemptedAt_idx" ON "NotificationDelivery"("status", "attemptedAt");

ALTER TABLE "NotificationTemplate"
ADD CONSTRAINT "NotificationTemplate_channelId_fkey"
FOREIGN KEY ("channelId") REFERENCES "NotificationChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NotificationRequest"
ADD CONSTRAINT "NotificationRequest_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NotificationRequest"
ADD CONSTRAINT "NotificationRequest_channelId_fkey"
FOREIGN KEY ("channelId") REFERENCES "NotificationChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery"
ADD CONSTRAINT "NotificationDelivery_notificationRequestId_fkey"
FOREIGN KEY ("notificationRequestId") REFERENCES "NotificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery"
ADD CONSTRAINT "NotificationDelivery_channelId_fkey"
FOREIGN KEY ("channelId") REFERENCES "NotificationChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
