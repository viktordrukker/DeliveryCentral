-- AlterEnum: add code-referenced enum values that pre-existed in app
-- code (project-pulse.service.ts) but were never added to the DB enum.
-- Doing it here in the same forward-only reconcile pass.
ALTER TYPE "AggregateType" ADD VALUE IF NOT EXISTS 'ProjectChangeRequest';
ALTER TYPE "AggregateType" ADD VALUE IF NOT EXISTS 'ProjectMilestone';
ALTER TYPE "AggregateType" ADD VALUE IF NOT EXISTS 'ProjectRadiatorOverride';

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "AssignmentApproval" DROP CONSTRAINT IF EXISTS "AssignmentApproval_assignmentId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "AssignmentHistory" DROP CONSTRAINT IF EXISTS "AssignmentHistory_assignmentId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "CaseParticipant" DROP CONSTRAINT IF EXISTS "CaseParticipant_caseRecordId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "CaseStep" DROP CONSTRAINT IF EXISTS "CaseStep_caseRecordId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_tenantId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "Person" DROP CONSTRAINT IF EXISTS "Person_gradeId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "Person" DROP CONSTRAINT IF EXISTS "Person_jobRoleId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "Person" DROP CONSTRAINT IF EXISTS "Person_locationId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_domainId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_projectTypeId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "grades" DROP CONSTRAINT IF EXISTS "grades_tenantId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "job_roles" DROP CONSTRAINT IF EXISTS "job_roles_tenantId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "locations" DROP CONSTRAINT IF EXISTS "locations_tenantId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "project_domains" DROP CONSTRAINT IF EXISTS "project_domains_tenantId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropForeignKey
DO $$ BEGIN
  ALTER TABLE "project_types" DROP CONSTRAINT IF EXISTS "project_types_tenantId_fkey";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropIndex
DROP INDEX IF EXISTS "CaseRecord_tenantId_caseNumber_key";

-- DropIndex
DROP INDEX IF EXISTS "OrgUnit_tenantId_code_key";

-- DropIndex
DROP INDEX IF EXISTS "Person_gradeId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Person_jobRoleId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Person_locationId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Project_domainId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Project_projectTypeId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Project_tenantId_projectCode_key";

-- DropIndex
DROP INDEX IF EXISTS "in_app_notifications_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "in_app_notifications_recipientPersonId_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "leave_requests_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "period_locks_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "person_cost_rates_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "person_skills_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "project_budgets_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "pulse_entries_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "skills_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "skills_tenantId_name_key";

-- DropIndex
DROP INDEX IF EXISTS "staffing_request_fulfilments_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "staffing_requests_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "timesheet_entries_id_new_key";

-- DropIndex
DROP INDEX IF EXISTS "timesheet_weeks_id_new_key";

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "Currency" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "Person" DROP COLUMN IF EXISTS "gradeId",
DROP COLUMN IF EXISTS "jobRoleId",
DROP COLUMN IF EXISTS "locationId";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "Project" DROP COLUMN IF EXISTS "domainId",
DROP COLUMN IF EXISTS "projectTypeId";
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "budget_approvals" ALTER COLUMN "decisionAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "requestedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "contacts" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "employment_events" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "in_app_notifications" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "leave_requests" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "period_locks" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "person_cost_rates" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "person_skills" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_budgets" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_change_requests" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_milestones" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_radiator_overrides" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_retrospectives" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_risks" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_tags" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_technologies" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "project_workstreams" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "pulse_entries" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "pulse_reports" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "radiator_threshold_configs" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "skills" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "staffing_request_fulfilments" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "staffing_requests" ALTER COLUMN "skills" DROP DEFAULT,
ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "timesheet_entries" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "timesheet_weeks" ALTER COLUMN "id_new" SET NOT NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "vendor_skill_areas" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- DropTable
DROP TABLE IF EXISTS "Notification";

-- DropTable
DROP TABLE IF EXISTS "grades";

-- DropTable
DROP TABLE IF EXISTS "job_roles";

-- DropTable
DROP TABLE IF EXISTS "locations";

-- DropTable
DROP TABLE IF EXISTS "project_domains";

-- DropTable
DROP TABLE IF EXISTS "project_types";

-- DropEnum
DROP TYPE IF EXISTS "NotificationChannelKind";

-- DropEnum
DROP TYPE IF EXISTS "NotificationStatus";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CaseRecord_caseNumber_key" ON "CaseRecord"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrgUnit_code_key" ON "OrgUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Person_personNumber_key" ON "Person"("personNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Person_primaryEmail_key" ON "Person"("primaryEmail");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectAssignment_assignmentCode_key" ON "ProjectAssignment"("assignmentCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "in_app_notifications_recipientPersonId_createdAt_idx" ON "in_app_notifications"("recipientPersonId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "skills_name_key" ON "skills"("name");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_deliveryManagerId_fkey" FOREIGN KEY ("deliveryManagerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AssignmentApproval" ADD CONSTRAINT "AssignmentApproval_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CaseStep" ADD CONSTRAINT "CaseStep_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES "CaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CaseParticipant" ADD CONSTRAINT "CaseParticipant_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES "CaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "EmployeeActivityEvent" ADD CONSTRAINT "EmployeeActivityEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "clients" ADD CONSTRAINT "clients_accountManagerPersonId_fkey" FOREIGN KEY ("accountManagerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "project_vendor_engagements" ADD CONSTRAINT "project_vendor_engagements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "project_vendor_engagements" ADD CONSTRAINT "project_vendor_engagements_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "project_role_plans" ADD CONSTRAINT "project_role_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "project_rag_snapshots" ADD CONSTRAINT "project_rag_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_case_step_case_record_id' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CaseStep_caseRecordId_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_case_step_case_record_id" RENAME TO "CaseStep_caseRecordId_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notification_delivery_channel_id' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'NotificationDelivery_channelId_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_notification_delivery_channel_id" RENAME TO "NotificationDelivery_channelId_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notification_request_template_id' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'NotificationRequest_templateId_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_notification_request_template_id" RENAME TO "NotificationRequest_templateId_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_person_external_identity_person_id' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PersonExternalIdentityLink_personId_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_person_external_identity_person_id" RENAME TO "PersonExternalIdentityLink_personId_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_in_app_notification_recipient' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'in_app_notifications_recipientPersonId_readAt_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_in_app_notification_recipient" RENAME TO "in_app_notifications_recipientPersonId_readAt_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_request_person' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'leave_requests_personId_status_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_leave_request_person" RENAME TO "leave_requests_personId_status_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_person_skill_person' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'person_skills_personId_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_person_skill_person" RENAME TO "person_skills_personId_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pulse_entry_person_week' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'pulse_entries_personId_weekStart_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_pulse_entry_person_week" RENAME TO "pulse_entries_personId_weekStart_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timesheet_week_person' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'timesheet_weeks_personId_weekStart_idx' AND schemaname = 'public') THEN
    ALTER INDEX "idx_timesheet_week_person" RENAME TO "timesheet_weeks_personId_weekStart_idx";
  END IF;
END $$;

