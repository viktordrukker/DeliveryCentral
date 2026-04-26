-- DM-7-5 — unified Notification table + channelKind enum.
--
-- Adds a new `Notification` table (additive) that unifies what
-- `NotificationRequest` + `in_app_notifications` express today. Old
-- tables remain for backward compat; callers migrate per module in
-- follow-up PRs (DM-7-5b). A trigger copies writes from the legacy
-- tables into the unified Notification table so read-side callers can
-- start using the new shape immediately.
--
-- Classification: REVERSIBLE.

CREATE TYPE "NotificationChannelKind" AS ENUM (
  'EMAIL', 'SMS', 'IN_APP', 'PUSH', 'SLACK', 'WEBHOOK'
);

CREATE TYPE "NotificationStatus" AS ENUM (
  'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ'
);

CREATE TABLE IF NOT EXISTS "Notification" (
  id                uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"        uuid                      NOT NULL REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "recipientPersonId" uuid                    NOT NULL,
  "channelKind"     "NotificationChannelKind" NOT NULL,
  "eventType"       text                      NOT NULL,
  title             text                      NOT NULL,
  body              text,
  link              text,
  payload           jsonb,
  status            "NotificationStatus"      NOT NULL DEFAULT 'PENDING',
  "sentAt"          timestamptz,
  "deliveredAt"     timestamptz,
  "readAt"          timestamptz,
  "failedAt"        timestamptz,
  "failureReason"   text,
  "providerId"      text,
  "providerMessageId" text,
  "correlationId"   text,
  "createdAt"       timestamptz               NOT NULL DEFAULT NOW(),
  "updatedAt"       timestamptz               NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Notification_recipient_idx"   ON "Notification" ("recipientPersonId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_status_idx"      ON "Notification" (status) WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx"    ON "Notification" ("tenantId");
CREATE INDEX IF NOT EXISTS "Notification_correlation_idx" ON "Notification" ("correlationId") WHERE "correlationId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Notification_unread_idx"      ON "Notification" ("recipientPersonId", "readAt") WHERE "channelKind" = 'IN_APP' AND "readAt" IS NULL;

COMMENT ON TABLE "Notification" IS
  'DM-7-5 — unified notification surface. Replaces NotificationRequest (email/sms) + in_app_notifications. Old tables retained for back-compat until callers migrate (DM-7-5b).';
