import { PrismaClient } from '@prisma/client';

const TABLES = [
  '"CaseParticipant"',
  '"CaseStep"',
  '"CaseRecord"',
  '"CaseType"',
  '"AssignmentApproval"',
  '"AssignmentHistory"',
  '"WorkEvidenceLink"',
  '"WorkEvidence"',
  '"WorkEvidenceSource"',
  '"ExternalSyncState"',
  '"ProjectExternalLink"',
  '"ProjectAssignment"',
  '"Project"',
  '"CustomFieldValue"',
  '"CustomFieldDefinition"',
  '"MetadataEntry"',
  '"MetadataDictionary"',
  '"WorkflowStateDefinition"',
  '"WorkflowDefinition"',
  '"EntityLayoutDefinition"',
  '"ReportingLine"',
  '"PersonOrgMembership"',
  '"Position"',
  '"PersonResourcePoolMembership"',
  '"ResourcePool"',
  '"OrgUnit"',
  '"Person"',
];

export async function resetPersistenceTestDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;',
  );
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE;`);
}
