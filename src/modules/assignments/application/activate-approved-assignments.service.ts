import { Injectable, Logger } from '@nestjs/common';

import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';

/**
 * Activates all BOOKED/ONBOARDING assignments whose validFrom date has been reached.
 * Should be called periodically (e.g., on dashboard load or via cron)
 * to ensure assignments transition BOOKED → ASSIGNED on time.
 */
@Injectable()
export class ActivateApprovedAssignmentsService {
  private readonly logger = new Logger(ActivateApprovedAssignmentsService.name);

  public constructor(
    private readonly repo: ProjectAssignmentRepositoryPort,
  ) {}

  public async execute(asOf?: Date): Promise<number> {
    const now = asOf ?? new Date();
    const all = await this.repo.findAll();
    let activated = 0;

    for (const assignment of all) {
      if (
        (assignment.status.value === 'BOOKED' || assignment.status.value === 'ONBOARDING') &&
        assignment.validFrom <= now
      ) {
        try {
          assignment.activate();
          await this.repo.save(assignment);
          activated++;
        } catch (error) {
          this.logger.warn(
            `Failed to activate assignment ${assignment.assignmentId.value}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    if (activated > 0) {
      this.logger.log(`Activated ${activated} assignment(s) as of ${now.toISOString()}`);
    }

    return activated;
  }
}
