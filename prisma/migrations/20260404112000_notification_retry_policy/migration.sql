ALTER TYPE "NotificationRequestStatus" RENAME VALUE 'FAILED' TO 'FAILED_TERMINAL';
ALTER TYPE "NotificationRequestStatus" ADD VALUE IF NOT EXISTS 'RETRYING';

ALTER TYPE "NotificationDeliveryStatus" RENAME VALUE 'FAILED' TO 'FAILED_TERMINAL';
ALTER TYPE "NotificationDeliveryStatus" ADD VALUE IF NOT EXISTS 'RETRYING';

ALTER TABLE "NotificationRequest"
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

ALTER TABLE "NotificationDelivery"
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

CREATE INDEX "NotificationRequest_status_nextAttemptAt_idx"
  ON "NotificationRequest"("status", "nextAttemptAt");

CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx"
  ON "NotificationDelivery"("status", "nextAttemptAt");
