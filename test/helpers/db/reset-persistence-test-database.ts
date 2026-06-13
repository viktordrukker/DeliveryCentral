import { PrismaClient } from '@prisma/client';

const TABLES = [
  '"CaseParticipant"',
  '"CaseStep"',
  '"CaseRecord"',
  '"CaseType"',
  // AssignmentApproval / AssignmentHistory / ProjectAssignment were dropped by
  // migration 20260609_lean_p3_2_drop_legacy_tables (lean migration, PR
  // LEAN-P3-2). ProjectPosition is the durable replacement aggregate.
  '"WorkEvidenceLink"',
  '"WorkEvidence"',
  '"WorkEvidenceSource"',
  '"ExternalSyncState"',
  '"ProjectExternalLink"',
  '"ProjectPosition"',
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
    'ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;',
  );
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE;`);

  // TRUNCATE ... CASCADE chains through the Tenant FK graph and wipes the
  // `platform_settings` row that marks setup complete. Without restoring it,
  // the global RequireSetupCompleteGuard 503s every subsequent app-booting
  // suite in the same single-worker DB run (order-dependent flakiness). Re-seed
  // it so the gate stays satisfied — this mirrors the "mark setup as complete"
  // step the CI backend-db job runs before the suite.
  await prisma.$executeRawUnsafe(
    `INSERT INTO platform_settings (key, value, "updatedAt")
     VALUES ('setup.completedAt', to_jsonb(now()::text), now())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt";`,
  );
}
