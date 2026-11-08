DROP INDEX IF EXISTS "Notification_unread_idx";
DROP INDEX IF EXISTS "Notification_correlation_idx";
DROP INDEX IF EXISTS "Notification_tenantId_idx";
DROP INDEX IF EXISTS "Notification_status_idx";
DROP INDEX IF EXISTS "Notification_recipient_idx";
DROP TABLE IF EXISTS "Notification";
DROP TYPE IF EXISTS "NotificationStatus";
DROP TYPE IF EXISTS "NotificationChannelKind";
