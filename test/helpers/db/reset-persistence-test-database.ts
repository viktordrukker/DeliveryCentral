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
  // TEST-05: refuse to truncate unless the connection string clearly points to
  // a test database. The function TRUNCATES 27 tables; running it against a
  // dev or prod connection would destroy data instantly.
  //
  // Acceptance rule: DATABASE_URL must include `test` (the conventional name
  // segment used by `workload_tracking_test` etc.) OR point at `localhost`/
  // `127.0.0.1`/the docker-compose `postgres` host. Anything else throws.
  const url = process.env.DATABASE_URL ?? '';
  const looksLikeTest =
    /test/i.test(url) ||
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('@postgres:') ||
    url.includes('@postgres/');
  if (!looksLikeTest) {
    throw new Error(
      'resetPersistenceTestDatabase refused to run: DATABASE_URL does not look like a test ' +
        'database (must contain "test" or point at localhost/127.0.0.1/postgres). ' +
        'Set DATABASE_URL to a test connection or rename the database before re-running.',
    );
  }

  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;',
  );
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE;`);
}
