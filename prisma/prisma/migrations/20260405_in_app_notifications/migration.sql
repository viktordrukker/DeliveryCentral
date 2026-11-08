CREATE TABLE "in_app_notifications" (
  "id" TEXT NOT NULL,
  "recipientPersonId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "link" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "in_app_notifications_recipientPersonId_createdAt_idx"
  ON "in_app_notifications"("recipientPersonId", "createdAt" DESC);
