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

    await this.logger.wrap(runId, 'seed', 'seed.demo.dataset', () => seed.seedDataset(dataset));
    await this.logger.wrap(runId, 'seed', 'seed.demo.itCompanyAccounts', () =>
      seed.seedItCompanyAccounts(),
    );
    await this.logger.wrap(runId, 'seed', 'seed.demo.itCompanyPersonSkills', () =>
      seed.seedItCompanyPersonSkills(),
    );
  }
}
