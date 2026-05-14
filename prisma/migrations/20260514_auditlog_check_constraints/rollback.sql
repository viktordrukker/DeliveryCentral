-- F-5.7 rollback — drops the eight AuditLog CHECK constraints.
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_chainSeq_positive_check";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_rowHash_shape_check";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_prevHash_shape_check";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_correlationId_maxlen_check";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_createdAt_not_future_check";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_payload_is_object_check";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_eventName_maxlen_check";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_eventName_nonempty_check";
