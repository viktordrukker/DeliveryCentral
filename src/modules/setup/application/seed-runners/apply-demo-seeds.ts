import { Injectable } from '@nestjs/common';

import { SetupLoggerService } from '../setup-logger.service';

/**
 * Wizard's `seed` step (profile = `demo`): full IT-company scenario on top
 * of the infrastructure layer. ApplyInfrastructureSeedsRunner is invoked
 * by SetupService BEFORE this runner.
 */
@Injectable()
export class ApplyDemoSeedsRunner {
  public constructor(private readonly logger: SetupLoggerService) {}

  public async run(runId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const seed = require('../../../../../prisma/seed') as {
      clearOperatingData: () => Promise<void>;
      seedDataset: (dataset: unknown) => Promise<void>;
      seedItCompanyAccounts: () => Promise<void>;
      seedItCompanyPersonSkills: () => Promise<void>;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const profile = require('../../../../../prisma/seeds/it-company-profile') as Record<string, unknown>;

    const dataset = {
      assignmentApprovals: profile.itCompanyAssignmentApprovals,
      assignmentHistory: profile.itCompanyAssignmentHistory,
      assignments: profile.itCompanyAssignments,
      externalSyncStates: profile.itCompanyExternalSyncStates,
      orgUnits: profile.itCompanyOrgUnits,
      people: profile.itCompanyPeople,
      personOrgMemberships: profile.itCompanyPersonOrgMemberships,
      positions: profile.itCompanyPositions,
      projectExternalLinks: profile.itCompanyProjectExternalLinks,
      projects: profile.itCompanyProjects,
      reportingLines: profile.itCompanyReportingLines,
      resourcePoolMemberships: profile.itCompanyResourcePoolMemberships,
      resourcePools: profile.itCompanyResourcePools,
      summary: profile.itCompanyDatasetSummary,
      workEvidence: profile.itCompanyWorkEvidence,
      workEvidenceLinks: profile.itCompanyWorkEvidenceLinks,
      workEvidenceSources: profile.itCompanyWorkEvidenceSources,
    };

    // Demo dataset uses deterministic UUIDs. Running it on a DB that already
    // holds the same dataset (or a slightly different copy from a prior
    // schema version) would either trip a unique-id conflict on bulk insert
    // or, if we silently skipped duplicates, leave stale rows missing newly
    // added columns. Wipe operating data first — narrower than the seed-time
    // `clearExistingData` so the wizard-created admin, Tenant, and the
    // infrastructure layer (skills, dictionaries, notification templates,
    // platform_settings) all survive.
    await this.logger.wrap(runId, 'seed', 'seed.demo.clearOperatingData', () =>
      seed.clearOperatingData(),
    );
    await this.logger.wrap(runId, 'seed', 'seed.demo.dataset', () => seed.seedDataset(dataset));
    await this.logger.wrap(runId, 'seed', 'seed.demo.itCompanyAccounts', () =>
      seed.seedItCompanyAccounts(),
    );
    await this.logger.wrap(runId, 'seed', 'seed.demo.itCompanyPersonSkills', () =>
      seed.seedItCompanyPersonSkills(),
    );
  }
}
