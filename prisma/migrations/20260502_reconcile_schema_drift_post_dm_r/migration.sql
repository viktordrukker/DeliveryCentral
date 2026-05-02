-- DropForeignKey
ALTER TABLE "AssignmentApproval" DROP CONSTRAINT "AssignmentApproval_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "AssignmentHistory" DROP CONSTRAINT "AssignmentHistory_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "CaseParticipant" DROP CONSTRAINT "CaseParticipant_caseRecordId_fkey";

-- DropForeignKey
ALTER TABLE "CaseStep" DROP CONSTRAINT "CaseStep_caseRecordId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_jobRoleId_fkey";

-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_locationId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_domainId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_projectTypeId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "job_roles" DROP CONSTRAINT "job_roles_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "locations" DROP CONSTRAINT "locations_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "project_domains" DROP CONSTRAINT "project_domains_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "project_types" DROP CONSTRAINT "project_types_tenantId_fkey";

-- DropIndex
DROP INDEX "CaseRecord_tenantId_caseNumber_key";

-- DropIndex
DROP INDEX "OrgUnit_tenantId_code_key";

-- DropIndex
DROP INDEX "Person_gradeId_idx";

-- DropIndex
DROP INDEX "Person_jobRoleId_idx";

-- DropIndex
DROP INDEX "Person_locationId_idx";

-- DropIndex
DROP INDEX "Project_domainId_idx";

-- DropIndex
DROP INDEX "Project_projectTypeId_idx";

-- DropIndex
DROP INDEX "Project_tenantId_projectCode_key";

-- DropIndex
DROP INDEX "in_app_notifications_id_new_key";

-- DropIndex
DROP INDEX "in_app_notifications_recipientPersonId_createdAt_idx";

-- DropIndex
DROP INDEX "leave_requests_id_new_key";

-- DropIndex
DROP INDEX "period_locks_id_new_key";

-- DropIndex
DROP INDEX "person_cost_rates_id_new_key";

-- DropIndex
DROP INDEX "person_skills_id_new_key";

-- DropIndex
DROP INDEX "project_budgets_id_new_key";

-- DropIndex
DROP INDEX "pulse_entries_id_new_key";

-- DropIndex
DROP INDEX "skills_id_new_key";

-- DropIndex
DROP INDEX "skills_tenantId_name_key";

-- DropIndex
DROP INDEX "staffing_request_fulfilments_id_new_key";

-- DropIndex
DROP INDEX "staffing_requests_id_new_key";

-- DropIndex
DROP INDEX "timesheet_entries_id_new_key";

-- DropIndex
DROP INDEX "timesheet_weeks_id_new_key";

-- AlterTable
ALTER TABLE "Currency" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Person" DROP COLUMN "gradeId",
DROP COLUMN "jobRoleId",
DROP COLUMN "locationId";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "domainId",
DROP COLUMN "projectTypeId";

-- AlterTable
ALTER TABLE "budget_approvals" ALTER COLUMN "decisionAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "requestedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "employment_events" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "in_app_notifications" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "period_locks" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "person_cost_rates" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "person_skills" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "project_budgets" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "project_change_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_milestones" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_radiator_overrides" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_retrospectives" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "project_risks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_tags" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "project_technologies" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "project_workstreams" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pulse_entries" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "pulse_reports" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "radiator_threshold_configs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "skills" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "staffing_request_fulfilments" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "staffing_requests" ALTER COLUMN "skills" DROP DEFAULT,
ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "timesheet_entries" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "timesheet_weeks" ALTER COLUMN "id_new" SET NOT NULL;

-- AlterTable
ALTER TABLE "vendor_skill_areas" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "grades";

-- DropTable
DROP TABLE "job_roles";

-- DropTable
DROP TABLE "locations";

-- DropTable
DROP TABLE "project_domains";

-- DropTable
DROP TABLE "project_types";

-- DropEnum
DROP TYPE "NotificationChannelKind";

-- DropEnum
DROP TYPE "NotificationStatus";

-- CreateIndex
CREATE UNIQUE INDEX "CaseRecord_caseNumber_key" ON "CaseRecord"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_code_key" ON "OrgUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Person_personNumber_key" ON "Person"("personNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Person_primaryEmail_key" ON "Person"("primaryEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_assignmentCode_key" ON "ProjectAssignment"("assignmentCode");

-- CreateIndex
CREATE INDEX "in_app_notifications_recipientPersonId_createdAt_idx" ON "in_app_notifications"("recipientPersonId", "createdAt");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_deliveryManagerId_fkey" FOREIGN KEY ("deliveryManagerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentApproval" ADD CONSTRAINT "AssignmentApproval_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStep" ADD CONSTRAINT "CaseStep_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES "CaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseParticipant" ADD CONSTRAINT "CaseParticipant_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES "CaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeActivityEvent" ADD CONSTRAINT "EmployeeActivityEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_accountManagerPersonId_fkey" FOREIGN KEY ("accountManagerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_vendor_engagements" ADD CONSTRAINT "project_vendor_engagements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_vendor_engagements" ADD CONSTRAINT "project_vendor_engagements_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_role_plans" ADD CONSTRAINT "project_role_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_rag_snapshots" ADD CONSTRAINT "project_rag_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_case_step_case_record_id" RENAME TO "CaseStep_caseRecordId_idx";

-- RenameIndex
ALTER INDEX "idx_notification_delivery_channel_id" RENAME TO "NotificationDelivery_channelId_idx";

-- RenameIndex
ALTER INDEX "idx_notification_request_template_id" RENAME TO "NotificationRequest_templateId_idx";

-- RenameIndex
ALTER INDEX "idx_person_external_identity_person_id" RENAME TO "PersonExternalIdentityLink_personId_idx";

-- RenameIndex
ALTER INDEX "idx_in_app_notification_recipient" RENAME TO "in_app_notifications_recipientPersonId_readAt_idx";

-- RenameIndex
ALTER INDEX "idx_leave_request_person" RENAME TO "leave_requests_personId_status_idx";

-- RenameIndex
ALTER INDEX "idx_person_skill_person" RENAME TO "person_skills_personId_idx";

-- RenameIndex
ALTER INDEX "idx_pulse_entry_person_week" RENAME TO "pulse_entries_personId_weekStart_idx";

-- RenameIndex
ALTER INDEX "idx_timesheet_week_person" RENAME TO "timesheet_weeks_personId_weekStart_idx";

