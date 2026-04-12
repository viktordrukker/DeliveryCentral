-- Add indexes for frequently-queried foreign keys
CREATE INDEX IF NOT EXISTS "idx_notification_request_template_id" ON "NotificationRequest" ("templateId");
CREATE INDEX IF NOT EXISTS "idx_notification_delivery_channel_id" ON "NotificationDelivery" ("channelId");
CREATE INDEX IF NOT EXISTS "idx_person_external_identity_person_id" ON "PersonExternalIdentityLink" ("personId");
CREATE INDEX IF NOT EXISTS "idx_case_step_case_record_id" ON "CaseStep" ("caseRecordId");
CREATE INDEX IF NOT EXISTS "idx_in_app_notification_recipient" ON "in_app_notifications" ("recipientPersonId", "readAt");
CREATE INDEX IF NOT EXISTS "idx_pulse_entry_person_week" ON "pulse_entries" ("personId", "weekStart");
CREATE INDEX IF NOT EXISTS "idx_timesheet_week_person" ON "timesheet_weeks" ("personId", "weekStart");
CREATE INDEX IF NOT EXISTS "idx_leave_request_person" ON "leave_requests" ("personId", "status");
CREATE INDEX IF NOT EXISTS "idx_staffing_request_project" ON "staffing_requests" ("projectId", "status");
CREATE INDEX IF NOT EXISTS "idx_person_skill_person" ON "person_skills" ("personId");
CREATE INDEX IF NOT EXISTS "idx_audit_log_aggregate" ON "AuditLog" ("aggregateType", "aggregateId");
